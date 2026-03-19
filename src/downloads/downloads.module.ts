import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DownloadsController } from './downloads.controller';
import { ProductsModule } from '../products/products.module';
import { ReleasesModule } from '../releases/releases.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 10000, maxRedirects: 3 }),
    ProductsModule,
    ReleasesModule,
    ArtifactsModule,
  ],
  controllers: [DownloadsController],
})
export class DownloadsModule {}
