import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BlogPost, BlogPostSchema } from "../../schemas";
import { BlogService } from "./blog.service";
import { BlogController } from "./blog.controller";

@Module({
  imports: [MongooseModule.forFeature([{ name: BlogPost.name, schema: BlogPostSchema }])],
  controllers: [BlogController],
  providers: [BlogService],
})
export class BlogModule {}
