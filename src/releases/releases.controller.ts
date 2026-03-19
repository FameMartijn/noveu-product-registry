import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReleasesService } from './releases.service';
import { ProductsService } from '../products/products.service';
import { ReleaseChannel } from './entities/release.entity';

@ApiTags('releases')
@Controller('products/:slug')
export class ReleasesController {
  constructor(
    private readonly releasesService: ReleasesService,
    private readonly productsService: ProductsService,
  ) {}

  @Get('releases')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Releases voor een product', description: 'Retourneert gepagineerde releases voor een product' })
  @ApiParam({ name: 'slug', example: 'noveuflow' })
  @ApiQuery({ name: 'channel', enum: ReleaseChannel, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Releases gevonden' })
  @ApiResponse({ status: 404, description: 'Product niet gevonden' })
  async findByProduct(
    @Param('slug') slug: string,
    @Query('channel') channel?: ReleaseChannel,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const product = await this.productsService.findOneBySlug(slug);
    const result = await this.releasesService.findByProduct(
      product.id,
      channel,
      page || 1,
      limit || 20,
    );
    return {
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    };
  }

  @Get('update-check')
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  @ApiOperation({
    summary: 'WordPress update check',
    description: 'Retourneert update informatie in WordPress PluginUpdateChecker formaat',
  })
  @ApiParam({ name: 'slug', example: 'noveuflow' })
  @ApiQuery({ name: 'version', required: false, description: 'Huidige versie van de plugin' })
  @ApiResponse({ status: 200, description: 'Update informatie' })
  @ApiResponse({ status: 404, description: 'Product niet gevonden' })
  async getUpdateCheck(
    @Param('slug') slug: string,
    @Query('version') currentVersion?: string,
  ) {
    const result = await this.releasesService.getUpdateCheckResponse(slug, currentVersion);
    if (!result) {
      return {
        success: true,
        data: null,
        message: 'Geen releases beschikbaar',
      };
    }
    return result;
  }
}
