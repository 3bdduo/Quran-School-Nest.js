import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentUserPayload {
  role: "admin" | "teacher" | "student";
  username: string;
  teacherId?: string | null;
  teacherType?: "group" | "edu" | "other" | null;
  groupIds?: string[];
  groupId?: string | null; // For legacy
  eduGroupId?: string | null;
  studentId?: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
