import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { Settings, BlogPost, MediaItem } from "../schemas";

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(BlogPost.name) private readonly blogModel: Model<BlogPost>,
    @InjectModel(MediaItem.name) private readonly mediaModel: Model<MediaItem>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedSettings();
    await this.seedBlog();
    await this.seedMedia();
  }

  private async seedSettings() {
    const existing = await this.settingsModel.findById(1);
    if (existing) return;

    const defaultPassword = this.configService.get<string>("adminDefaultPassword") || "Admin123";
    const adminPassword = await bcrypt.hash(defaultPassword, 10);

    await this.settingsModel.create({
      _id: 1,
      school_name: "مدرسة التربية بالقرءان الكريم",
      school_phone: "01120449993",
      school_address: "مصر , بني سويف , اهناسيا , قرية النويرة",
      monthly_fee: 200,
      admin_password: adminPassword,
    });

    this.logger.log("✅ تم إنشاء الإعدادات الافتراضية (اسم دخول الأدمن: Admin)");
  }

  private async seedBlog() {
    const count = await this.blogModel.countDocuments();
    if (count > 0) return;

    const posts = [
      {
        id: "post-top-quran-resources",
        title: "أفضل المنصات والمواقع الموصى بها لخدمة القرآن الكريم وتدبره",
        slug: "top-recommended-quran-resources",
        category: "فوائد قرآنية",
        author: "إدارة المدرسة",
        published: true,
        published_at: new Date(),
        excerpt: "دليل شامل وموجز يجمع لك أفضل المنصات والمواقع الرقمية العالمية المعتمدة لتدبر القرآن الكريم وقراءته وتفاسيره.",
        content: `بسم الله الرحمن الرحيم، والصلاة والسلام على رسول الله صلى الله عليه وسلم.

يسرنا في مدرسة التربية بالقرآن الكريم تقديم دليل بأفضل المواقع الموصى بها في خدمة القرآن الكريم:

1. منصة القرآن الكريم التفاعلية (Quran.com)
أشهر منصة عالمية لتلاوة القرآن، ترجمة معانيه لأكثر من 80 لغة، والاستماع لكبار مشاهير القراء مع التفسير المتزامن.

2. منصة الباحث القرآني (Tafsir.app)
أشمل محرك بحث في تفاسير أهل السنة والجماعة، يضم أكثر من 30 تفسيراً معتمداً وإعراب القرآن وغريب الكلمات.

3. مجمع الملك فهد لطباعة المصحف الشريف (Qurancomplex.gov.sa)
المرجع الرسمي لضبط رسم المصحف والخطوط العثمانية المعتمدة للمصاحف الرقمية.

4. المكتبة الشاملة - قسم علوم القرآن (Shamela.ws)
المرجع الأضخم لكتب التفسير، متون التجويد، والقراءات العشر.

5. إذاعة القرآن الكريم من القاهرة (بث مباشر)
المنهل العذب لأندر التلاوات المصرية المجودة لكبار القراء على مدار الساعة.`,
      },
      {
        id: "post-golden-rules-memorization",
        title: "القواعد الذهبية لحفظ القرآن الكريم وتثبيته دون نسيان",
        slug: "golden-rules-quran-memorization",
        category: "تربية",
        author: "إدارة المدرسة",
        published: true,
        published_at: new Date(),
        excerpt: "خطة عملية مجربة من كبار الحفاظ لضبط الحفظ الجديد وربطه بالمراجعة التراكمية اليومية.",
        content: `حفظ كتاب الله من أشرف المقامات. ولتثبيت الحفظ يوصي الحفاظ بالقواعد التالية:
1. إخلاص النية والاستعانة بالله.
2. الالتزام بطبعة مصحف واحدة لتثبيت الذاكرة البصرية.
3. التكرار التراكمي للآيات (15-20 مرة) قبل الانتقال للآية التالية.
4. المراجعة مقدمة دائماً على الحفظ الجديد.
5. القراءة بما تحفظ في صلاة النوافل وقيام الليل.`,
      },
      {
        id: "post-best-quran-apps",
        title: "أفضل التطبيقات القرآنية الموثوقة للهواتف الذكية",
        slug: "best-recommended-quran-apps",
        category: "فوائد قرآنية",
        author: "إدارة المدرسة",
        published: true,
        published_at: new Date(),
        excerpt: "ترشيحات موثوقة لتطبيقات الهاتف التي تساعد كل طالب في حفظ ومراجعة وتدبر القرآن الكريم.",
        content: `أفضل التطبيقات القرآنية الموصى بها للهواتف:
1. تطبيق آية (Ayah): تصميم فاخر هادئ، تفسير موثوق، وبدون أي إعلانات.
2. تطبيق ترتيل (Tarteel AI): استماع للتلاوة بالذكاء الاصطناعي وتصحيح فوري لأخطاء الحفظ.
3. تطبيق مُدّكر: لمدارسة تفسير وتدبر القرآن.
4. تطبيق المصحف المدرسي: مخصص للناشئة والحلقات مع خاصية ترديد الآيات.`,
      },
    ];

    await this.blogModel.insertMany(posts);
    this.logger.log("✅ تم إضافة المقالات والروابط القرآنية الموصى بها إلى المدونة");
  }

  private async seedMedia() {
    const count = await this.mediaModel.countDocuments();
    if (count > 0) return;

    const items = [
      {
        id: "media-hosary-muallam",
        title: "المصحف المعلم كاملاً - الشيخ محمود خليل الحصري",
        description: "القراءة النموذجية المتقنة بترديد الآيات، المصدر الأفضل لتعليم التلاوة وضبط مخارج الحروف للطلاب.",
        video_url: "https://www.youtube.com/embed/videoseries?list=PLP_4qKj3l3a7PZq2oB9W7yC4l2s9sXjX7",
        thumbnail_url: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=800&q=80",
        track: "تحفيظ",
        level: "جميع المستويات",
        teacher_name: "الشيخ محمود خليل الحصري",
        is_live: false,
        published: true,
      },
      {
        id: "media-tajweed-suwayd",
        title: "سلسلة التجويد المصور - فضيلة الدكتور أيمن رشدي سويد",
        description: "شرح شامل ومصور لمخارج الحروف وصفاتها وأحكام التلاوة بدقة علمية متميزة ومعتمدة عالمياً.",
        video_url: "https://www.youtube.com/embed/k9p-pQzE368",
        thumbnail_url: "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=800&q=80",
        track: "تفسير وتجويد",
        level: "متوسط ومتقدم",
        teacher_name: "د. أيمن رشدي سويد",
        is_live: false,
        published: true,
      },
      {
        id: "media-minshawi-murattal",
        title: "المصحف المرتل برواية حفص - الشيخ محمد صديق المنشاوي",
        description: "تلاوة خاشعة فريدة تعين الحافظ على الاستماع والتدبر، من أتقن التلاوات برواية حفص عن عاصم.",
        video_url: "https://www.youtube.com/embed/videoseries?list=PL89F8F87C5E98FDB8",
        thumbnail_url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
        track: "تحفيظ",
        level: "جميع المستويات",
        teacher_name: "الشيخ محمد صديق المنشاوي",
        is_live: false,
        published: true,
      },
      {
        id: "media-makkah-live",
        title: "بث مباشر: قناة القرآن الكريم من المسجد الحرام بمكة المكرمة",
        description: "بث مباشر على مدار الساعة للتلاوات العذبة من أروقة الحرم المكي الشريف وأجواء صلوات المسلمين.",
        video_url: "https://www.youtube.com/embed/moQ_hY74e6U",
        thumbnail_url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80",
        track: "تحفيظ",
        level: "بث مباشر",
        teacher_name: "أئمة الحرم المكي الشريف",
        is_live: true,
        published: true,
      },
    ];

    await this.mediaModel.insertMany(items);
    this.logger.log("✅ تم إضافة التسجيلات والروابط القرآنية الموصى بها إلى المكتبة");
  }
}
