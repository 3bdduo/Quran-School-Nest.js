// ============================================================================
// مكتبة الفالديشن المركزية — validation.utils.ts
// جميع قواعد التحقق من صحة البيانات المصرية تمر من هنا
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

// محافظات مصر — الأرقام 01-27 + بعض الرموز الخاصة
const VALID_GOV_CODES = new Set([
  "01","02","03","04","11","12","13","14","15","16","17","18","19",
  "21","22","23","24","25","26","27","28","29",
  "31","32","33","34","35","88","99",
]);

/**
 * التحقق من الرقم القومي المصري:
 * - 14 رقم بالضبط
 * - أول رقم: 2 (مواليد 1900s) أو 3 (مواليد 2000s)
 * - شهر ميلاد صحيح (01-12)
 * - يوم ميلاد صحيح (01-31)
 * - كود محافظة صحيح (positions 7-8)
 */
export function validateEgyptianNationalId(nid: string): ValidationResult {
  const v = (nid || "").trim();
  if (!/^\d{14}$/.test(v)) {
    return { valid: false, message: `الرقم القومي لازم يكون 14 رقم (المكتوب: ${v.length} رقم)` };
  }
  const century = v.charAt(0);
  if (century !== "2" && century !== "3") {
    return { valid: false, message: "الرقم القومي غير صحيح (أول رقم لازم يكون 2 أو 3)" };
  }
  const month = parseInt(v.substring(3, 5), 10);
  if (month < 1 || month > 12) {
    return { valid: false, message: "الرقم القومي غير صحيح (الشهر خاطئ)" };
  }
  const day = parseInt(v.substring(5, 7), 10);
  if (day < 1 || day > 31) {
    return { valid: false, message: "الرقم القومي غير صحيح (اليوم خاطئ)" };
  }
  const govCode = v.substring(7, 9);
  if (!VALID_GOV_CODES.has(govCode)) {
    return { valid: false, message: "الرقم القومي غير صحيح (رمز المحافظة غير معروف)" };
  }
  return { valid: true };
}

/**
 * التحقق من رقم الهاتف المصري:
 * - يبدأ بـ 010 أو 011 أو 012 أو 015
 * - 11 رقم إجمالاً
 */
export function validateEgyptianPhone(phone: string): ValidationResult {
  const v = (phone || "").replace(/[\s\-().+]/g, "").trim();
  // إزالة مفتاح الدولة +20 أو 0020
  const normalized = v.replace(/^(\+?20|0020)/, "0");
  if (!/^01[0125]\d{8}$/.test(normalized)) {
    return {
      valid: false,
      message: "رقم الهاتف غير صحيح — لازم يكون رقم مصري مثل: 01012345678",
    };
  }
  return { valid: true };
}

/**
 * التحقق من الاسم الرباعي:
 * - على الأقل 4 كلمات (3 مسافات)
 * - أحرف عربية فقط (مسموح بالمسافات)
 * - لا أرقام ولا رموز
 */
export function validateFullName(name: string): ValidationResult {
  const v = (name || "").trim();
  if (!v) {
    return { valid: false, message: "الاسم مطلوب" };
  }
  // لازم يحتوي على حروف عربية فقط ومسافات
  if (/[^\u0600-\u06FF\s]/.test(v)) {
    return { valid: false, message: "الاسم لازم يكون بالعربي فقط بدون أرقام أو رموز" };
  }
  const parts = v.split(/\s+/).filter(Boolean);
  if (parts.length < 4) {
    return { valid: false, message: `الاسم لازم يكون رباعي على الأقل (تم كتابة ${parts.length} ${parts.length === 1 ? "كلمة" : "كلمات"})` };
  }
  if (parts.some((p) => p.length < 2)) {
    return { valid: false, message: "كل جزء في الاسم لازم يكون كلمتين على الأقل" };
  }
  return { valid: true };
}

/**
 * التحقق من كلمة المرور:
 * - 6 أحرف على الأقل
 */
export function validatePassword(password: string, minLength = 6): ValidationResult {
  if (!password || password.length < minLength) {
    return { valid: false, message: `كلمة المرور لازم تكون ${minLength} أحرف على الأقل` };
  }
  return { valid: true };
}
