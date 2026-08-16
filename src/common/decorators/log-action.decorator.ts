import { SetMetadata } from "@nestjs/common";

// دي بتتحط فوق أي endpoint عشان توصف الحدث ده بالعربي في سجل النشاطات
// اللي هيتسجل أوتوماتيك من غير ما الفرونت إند يبعت طلب منفصل لعمل ده
export const LOG_ACTION_KEY = "log_action";
export const LogAction = (description: string) => SetMetadata(LOG_ACTION_KEY, description);
