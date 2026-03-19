import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Lijst alle publieke producten', description: 'Retourneert alle publiek zichtbare producten met hun laatste stabiele release' })
  @ApiResponse({ status: 200, description: 'Lijst van publieke producten' })
  async findAllPublic() {
    const products = await this.productsService.findAllPublic();
    return {
      success: true,
      data: products,
    };
  }

  @Get(':slug')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Product details op slug', description: 'Retourneert product details met de laatste release per kanaal' })
  @ApiParam({ name: 'slug', example: 'noveuflow' })
  @ApiResponse({ status: 200, description: 'Product gevonden' })
  @ApiResponse({ status: 404, description: 'Product niet gevonden' })
  async findBySlug(@Param('slug') slug: string) {
    const result = await this.productsService.findBySlug(slug);
    return {
      success: true,
      data: result,
    };
  }
}
