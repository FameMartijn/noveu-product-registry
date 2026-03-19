import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ProductsModule } from '../products/products.module';
import { ReleasesModule } from '../releases/releases.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';

@Module({
  imports: [ProductsModule, ReleasesModule, ArtifactsModule],
  controllers: [AdminController],
})
export class AdminModule {}
