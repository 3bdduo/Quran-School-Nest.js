import { SetMetadata } from "@nestjs/common";

// دي بتتحط فوق أي endpoint عايزينه يشتغل من غير توكن (زي تسجيل الدخول)
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
