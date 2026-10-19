import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, mongo } from "mongoose";
import * as path from "path";
import { StoredFile, FileCategory } from "../../schemas";

const CATEGORY_MAP: Record<string, FileCategory> = {
  // مستندات
  pdf: "documents",
  doc: "documents",
  docx: "documents",
  txt: "documents",
  rtf: "documents",
  odt: "documents",
  ppt: "documents",
  pptx: "documents",
  // جداول وبيانات
  xls: "spreadsheets",
  xlsx: "spreadsheets",
  csv: "spreadsheets",
  ods: "spreadsheets",
  // صور وتصاميم
  jpg: "images",
  jpeg: "images",
  png: "images",
  gif: "images",
  webp: "images",
  svg: "images",
  bmp: "images",
  ico: "images",
  // صوتيات وتسجيلات
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  m4a: "audio",
  aac: "audio",
  flac: "audio",
  // ملفات مضغوطة
  zip: "archives",
  rar: "archives",
  "7z": "archives",
  tar: "archives",
  gz: "archives",
};

export const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export function detectCategory(ext: string): FileCategory {
  const cleanExt = ext.toLowerCase().replace(/^\./, "");
  return CATEGORY_MAP[cleanExt] || "other";
}

export interface ExpressUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FilesVaultService {
  constructor(
    @InjectModel(StoredFile.name)
    private readonly fileModel: Model<StoredFile>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  private getBucket(): mongo.GridFSBucket {
    if (!this.connection.db) {
      throw new BadRequestException("قاعدة البيانات غير متصلة");
    }
    return new mongo.GridFSBucket(this.connection.db, { bucketName: "files_vault" });
  }

  // ── رفع ملف جديد ──────────────────────────────────────────────────
  async uploadFile(
    file: ExpressUploadedFile,
    body: { name?: string; notes?: string; isPublic?: string | boolean },
    username?: string,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException("لم يتم تحديد أي ملف للرفع");
    }

    const ext = path.extname(file.originalname).toLowerCase().replace(/^\./, "") || "bin";
    const category = detectCategory(ext);

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = ARABIC_MONTHS[now.getMonth()];
    const dateStr = now.toISOString().split("T")[0];

    const displayName = body.name?.trim() || file.originalname;
    const isPublic = body.isPublic === "false" || body.isPublic === false ? false : true;

    const bucket = this.getBucket();
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype || "application/octet-stream",
      metadata: {
        originalName: file.originalname,
        uploadedBy: username || "admin",
        category,
      },
    });

    await new Promise<void>((resolve, reject) => {
      uploadStream.end(file.buffer);
      uploadStream.on("finish", () => resolve());
      uploadStream.on("error", (err) => reject(err));
    });

    const doc = await this.fileModel.create({
      name: displayName,
      original_name: file.originalname,
      mime_type: file.mimetype || "application/octet-stream",
      extension: ext,
      category,
      size_bytes: file.size,
      gridfs_id: uploadStream.id,
      year,
      month,
      date_str: dateStr,
      uploaded_by: username || "admin",
      download_count: 0,
      is_public: isPublic,
      notes: body.notes?.trim() || undefined,
    });

    return doc;
  }

  // ── جلب قائمة الملفات مع الإحصاءات وشجرة المجلدات ────────────────────
  async findAll(query: { category?: string; year?: string; month?: string; search?: string }) {
    const filter: any = {};

    if (query.category && query.category !== "all") {
      filter.category = query.category;
    }
    if (query.year && query.year !== "all") {
      filter.year = query.year;
    }
    if (query.month && query.month !== "all") {
      filter.month = query.month;
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { original_name: { $regex: q, $options: "i" } },
        { notes: { $regex: q, $options: "i" } },
        { extension: { $regex: q, $options: "i" } },
      ];
    }

    const files = await this.fileModel.find(filter).sort({ created_at: -1 }).lean();

    // جلب كل السجلات بدون فلتر لحساب شجرة المجلدات والإحصاءات الشاملة
    const allFiles = await this.fileModel
      .find({}, { category: 1, year: 1, month: 1, size_bytes: 1, download_count: 1 })
      .lean();

    let totalSizeBytes = 0;
    let totalDownloads = 0;

    // تجميع شجرة المجلدات: Category -> Years -> Months
    const categoryTree: Record<
      string,
      {
        count: number;
        sizeBytes: number;
        years: Record<string, { count: number; months: Record<string, number> }>;
      }
    > = {
      documents: { count: 0, sizeBytes: 0, years: {} },
      spreadsheets: { count: 0, sizeBytes: 0, years: {} },
      images: { count: 0, sizeBytes: 0, years: {} },
      audio: { count: 0, sizeBytes: 0, years: {} },
      archives: { count: 0, sizeBytes: 0, years: {} },
      other: { count: 0, sizeBytes: 0, years: {} },
    };

    allFiles.forEach((f) => {
      totalSizeBytes += f.size_bytes || 0;
      totalDownloads += f.download_count || 0;

      const cat = f.category || "other";
      if (!categoryTree[cat]) {
        categoryTree[cat] = { count: 0, sizeBytes: 0, years: {} };
      }
      categoryTree[cat].count++;
      categoryTree[cat].sizeBytes += f.size_bytes || 0;

      const y = f.year || "2026";
      const m = f.month || "أكتوبر";
      if (!categoryTree[cat].years[y]) {
        categoryTree[cat].years[y] = { count: 0, months: {} };
      }
      categoryTree[cat].years[y].count++;
      categoryTree[cat].years[y].months[m] = (categoryTree[cat].years[y].months[m] || 0) + 1;
    });

    const stats = {
      totalFiles: allFiles.length,
      totalSizeBytes,
      totalDownloads,
    };

    return { files, stats, foldersTree: categoryTree };
  }

  // ── جلب تفاصيل ملف ──────────────────────────────────────────────────
  async findById(id: string) {
    const doc = await this.fileModel.findById(id).lean();
    if (!doc) throw new NotFoundException("الملف غير موجود");
    return doc;
  }

  // ── فتح ستريم التنزيل / المعاينة ─────────────────────────────────────
  async getFileStream(id: string) {
    const fileDoc = await this.fileModel.findById(id);
    if (!fileDoc) throw new NotFoundException("الملف غير موجود");

    // زيادة عداد التنزيلات
    fileDoc.download_count = (fileDoc.download_count || 0) + 1;
    await fileDoc.save();

    const bucket = this.getBucket();
    const stream = bucket.openDownloadStream(fileDoc.gridfs_id);

    return { fileDoc, stream };
  }

  // ── تعديل بيانات ملف ─────────────────────────────────────────────────
  async updateFile(
    id: string,
    body: { name?: string; notes?: string; category?: FileCategory; isPublic?: boolean },
  ) {
    const update: any = {};
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.notes !== undefined) update.notes = body.notes.trim();
    if (body.category !== undefined) update.category = body.category;
    if (body.isPublic !== undefined) update.is_public = body.isPublic;

    const updated = await this.fileModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!updated) throw new NotFoundException("الملف غير موجود");
    return updated;
  }

  // ── حذف ملف نهائياً ─────────────────────────────────────────────────
  async removeFile(id: string) {
    const fileDoc = await this.fileModel.findById(id);
    if (!fileDoc) throw new NotFoundException("الملف غير موجود");

    const bucket = this.getBucket();
    try {
      await bucket.delete(fileDoc.gridfs_id);
    } catch {
      // لو كان اتحذف من الجريد مسبقاً نتجاهل الخطأ
    }

    await this.fileModel.findByIdAndDelete(id);
    return { message: "تم حذف الملف بنجاح" };
  }
}
