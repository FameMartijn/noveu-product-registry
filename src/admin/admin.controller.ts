import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProductsService } from '../products/products.service';
import { ReleasesService } from '../releases/releases.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { UpdateReleaseDto } from '../releases/dto/update-release.dto';
import { ReleaseChannel, ReleaseStatus } from '../releases/entities/release.entity';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class AdminController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly releasesService: ReleasesService,
    private readonly artifactsService: ArtifactsService,
  ) {}

  // ---- Products ----

  @Get('products')
  @ApiOperation({ summary: 'Alle producten (incl. verborgen)', description: 'Admin: lijst alle producten inclusief niet-publieke' })
  @ApiResponse({ status: 200, description: 'Lijst van alle producten' })
  async listAllProducts() {
    const products = await this.productsService.findAll();
    return {
      success: true,
      data: products,
    };
  }

  @Post('products')
  @ApiOperation({ summary: 'Product aanmaken', description: 'Admin: maak een nieuw product aan' })
  @ApiResponse({ status: 201, description: 'Product aangemaakt' })
  @ApiResponse({ status: 409, description: 'Product slug bestaat al' })
  async createProduct(@Body() dto: CreateProductDto) {
    const product = await this.productsService.create(dto);
    return {
      success: true,
      data: product,
    };
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Product bijwerken', description: 'Admin: werk een bestaand product bij' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product bijgewerkt' })
  @ApiResponse({ status: 404, description: 'Product niet gevonden' })
  @ApiResponse({ status: 409, description: 'Product slug bestaat al' })
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const product = await this.productsService.update(id, dto);
    return {
      success: true,
      data: product,
    };
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Product verbergen (soft delete)', description: 'Admin: verberg een product (isPublic=false)' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product verborgen' })
  @ApiResponse({ status: 404, description: 'Product niet gevonden' })
  async deleteProduct(@Param('id') id: string) {
    const product = await this.productsService.softDelete(id);
    return {
      success: true,
      data: product,
      message: 'Product is verborgen',
    };
  }

  // ---- Releases ----

  @Get('releases')
  @ApiOperation({ summary: 'Releases beheren', description: 'Admin: lijst releases met optionele filters' })
  @ApiQuery({ name: 'productSlug', required: false })
  @ApiQuery({ name: 'channel', enum: ReleaseChannel, required: false })
  @ApiQuery({ name: 'status', enum: ReleaseStatus, required: false })
  @ApiResponse({ status: 200, description: 'Lijst van releases' })
  async listReleases(
    @Query('productSlug') productSlug?: string,
    @Query('channel') channel?: ReleaseChannel,
    @Query('status') status?: ReleaseStatus,
  ) {
    const releases = await this.releasesService.findAllFiltered({
      productSlug,
      channel,
      status,
    });
    return {
      success: true,
      data: releases,
    };
  }

  @Patch('releases/:id')
  @ApiOperation({ summary: 'Release bijwerken', description: 'Admin: werk release bij (status, changelog, metadata)' })
  @ApiParam({ name: 'id', description: 'Release UUID' })
  @ApiResponse({ status: 200, description: 'Release bijgewerkt' })
  @ApiResponse({ status: 404, description: 'Release niet gevonden' })
  async updateRelease(@Param('id') id: string, @Body() dto: UpdateReleaseDto) {
    const release = await this.releasesService.update(id, dto);
    return {
      success: true,
      data: release,
    };
  }

  @Delete('releases/:id')
  @ApiOperation({ summary: 'Release intrekken (yank)', description: 'Admin: trek een release in en verwijder cache' })
  @ApiParam({ name: 'id', description: 'Release UUID' })
  @ApiResponse({ status: 200, description: 'Release ingetrokken' })
  @ApiResponse({ status: 404, description: 'Release niet gevonden' })
  async yankRelease(@Param('id') id: string) {
    const release = await this.releasesService.yank(id);
    await this.artifactsService.invalidateCache(id);
    return {
      success: true,
      data: release,
      message: 'Release is ingetrokken en cache is verwijderd',
    };
  }
}
