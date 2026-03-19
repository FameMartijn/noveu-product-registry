import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Release } from '../releases/entities/release.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Release])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
