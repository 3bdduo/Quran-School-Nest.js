import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { ActivityLog } from "../../schemas";

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectModel(ActivityLog.name) private readonly activityLogModel: Model<ActivityLog>,
  ) {}

  // بتتسجل يدويًا من الفرونت إند لو احتاج، بس دلوقتي أغلب الأحداث بتتسجل أوتوماتيك
  async log(actorRole: string, actorUsername: string, action: string, method?: string, path?: string) {
    const id = uuidv4();
    return this.activityLogModel.create({
      id,
      actor_role: actorRole,
      actor_username: actorUsername,
      action,
      method,
      path,
    });
  }

  async findAll(query: {
    role?: string; username?: string; from?: string; to?: string; page?: number; limit?: number;
  }) {
    const filter: any = {};
    if (query.role) filter.actor_role = query.role;
    if (query.username) filter.actor_username = query.username;
    if (query.from || query.to) {
      filter.timestamp = {};
      if (query.from) filter.timestamp.$gte = new Date(query.from);
      if (query.to) filter.timestamp.$lte = new Date(query.to);
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.activityLogModel.countDocuments(filter),
      this.activityLogModel.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    ]);

    return { data, total, page, limit };
  }
}
