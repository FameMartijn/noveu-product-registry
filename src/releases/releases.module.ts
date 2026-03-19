import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Release } from './entities/release.entity';
import { Product } from '../products/entities/product.entity';
import { Artifact } from '../artifacts/entities/artifact.entity';
import { ReleasesService } from './releases.service';
import { ReleasesController } from './releases.controller';
import { InternalReleasesController } from './internal-releases.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Release, Product, Artifact]),
    ProductsModule,
  ],
  controllers: [ReleasesController, InternalReleasesController],
  providers: [ReleasesService],
  exports: [ReleasesService, TypeOrmModule],
})
export class ReleasesModule {}
