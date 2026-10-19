import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { LogAction } from "../../common/decorators/log-action.decorator";
import { CurrentUser, CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { FilesVaultService, ExpressUploadedFile } from "./files-vault.service";
import { FileCategory } from "../../schemas";

@Controller("files")
export class FilesVaultController {
  constructor(private readonly service: FilesVaultService) {}

  // POST /files/upload
  @Post("upload")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 100 * 1024 * 1024 } }))
  @LogAction("رفع ملف إلى مركز الملفات والمستندات")
  upload(
    @UploadedFile() file: ExpressUploadedFile,
    @Body() body: { name?: string; notes?: string; isPublic?: string | boolean },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.uploadFile(file, body, user?.username);
  }

  // GET /files?category=...&year=...&month=...&search=...
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  list(
    @Query("category") category?: string,
    @Query("year") year?: string,
    @Query("month") month?: string,
    @Query("search") search?: string,
  ) {
    return this.service.findAll({ category, year, month, search });
  }

  // GET /files/:id/download  (متاح للجميع للتنزيل برابط المشاركة)
  @Public()
  @Get(":id/download")
  async download(@Param("id") id: string, @Res() res: Response) {
    const { fileDoc, stream } = await this.service.getFileStream(id);
    const filename = `${fileDoc.name}.${fileDoc.extension}`;
    const encoded = encodeURIComponent(filename);

    res.setHeader("Content-Type", fileDoc.mime_type || "application/octet-stream");
    res.setHeader("Content-Length", fileDoc.size_bytes.toString());
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encoded}`);

    stream.pipe(res);
  }

  // GET /files/:id/preview  (معاينة مباشرة في المتصفح للصور و PDF)
  @Public()
  @Get(":id/preview")
  async preview(@Param("id") id: string, @Res() res: Response) {
    const { fileDoc, stream } = await this.service.getFileStream(id);
    const filename = `${fileDoc.name}.${fileDoc.extension}`;
    const encoded = encodeURIComponent(filename);

    res.setHeader("Content-Type", fileDoc.mime_type || "application/octet-stream");
    res.setHeader("Content-Length", fileDoc.size_bytes.toString());
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encoded}`);

    stream.pipe(res);
  }

  // GET /files/:id
  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  // PATCH /files/:id
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @LogAction("تعديل بيانات ملف")
  update(
    @Param("id") id: string,
    @Body() body: { name?: string; notes?: string; category?: FileCategory; isPublic?: boolean },
  ) {
    return this.service.updateFile(id, body);
  }

  // DELETE /files/:id
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @LogAction("حذف ملف من مركز الملفات")
  remove(@Param("id") id: string) {
    return this.service.removeFile(id);
  }
}
