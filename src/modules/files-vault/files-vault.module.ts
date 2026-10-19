import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { StoredFile, StoredFileSchema } from "../../schemas";
import { FilesVaultService } from "./files-vault.service";
import { FilesVaultController } from "./files-vault.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StoredFile.name, schema: StoredFileSchema },
    ]),
  ],
  controllers: [FilesVaultController],
  providers: [FilesVaultService],
  exports: [FilesVaultService],
})
export class FilesVaultModule {}
