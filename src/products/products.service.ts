import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Release, ReleaseChannel, ReleaseStatus } from '../releases/entities/release.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Release)
    private readonly releaseRepo: Repository<Release>,
  ) {}

  async findAllPublic(): Promise<Array<Product & { latestRelease?: Release }>> {
    const products = await this.productRepo.find({
      where: { isPublic: true },
      order: { name: 'ASC' },
    });

    const productsWithLatest = await Promise.all(
      products.map(async (product) => {
        const latestRelease = await this.getLatestStableRelease(product.id);
        return { ...product, latestRelease: latestRelease ?? undefined };
      }),
    );

    return productsWithLatest;
  }

  async findBySlug(slug: string): Promise<{
    product: Product;
    latestReleases: Record<string, Release | null>;
  }> {
    const product = await this.productRepo.findOne({
      where: { slug },
    });

    if (!product) {
      throw new NotFoundException(`Product met slug '${slug}' niet gevonden`);
    }

    const channels = Object.values(ReleaseChannel);
    const latestReleases: Record<string, Release | null> = {};

    await Promise.all(
      channels.map(async (channel) => {
        const release = await this.releaseRepo.findOne({
          where: {
            productId: product.id,
            channel,
            status: ReleaseStatus.PUBLISHED,
          },
          order: { publishedAt: 'DESC' },
          relations: ['artifacts'],
        });
        latestReleases[channel] = release;
      }),
    );

    return { product, latestReleases };
  }

  async findAll(): Promise<Product[]> {
    return this.productRepo.find({
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product met id '${id}' niet gevonden`);
    }
    return product;
  }

  async findOneBySlug(slug: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { slug } });
    if (!product) {
      throw new NotFoundException(`Product met slug '${slug}' niet gevonden`);
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productRepo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Product met slug '${dto.slug}' bestaat al`);
    }

    const product = this.productRepo.create(dto);
    const saved = await this.productRepo.save(product);
    this.logger.log(`Product aangemaakt: ${saved.slug} (${saved.id})`);
    return saved;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);

    if (dto.slug && dto.slug !== product.slug) {
      const existing = await this.productRepo.findOne({ where: { slug: dto.slug } });
      if (existing) {
        throw new ConflictException(`Product met slug '${dto.slug}' bestaat al`);
      }
    }

    const updated = { ...product, ...dto };
    const saved = await this.productRepo.save(updated);
    this.logger.log(`Product bijgewerkt: ${saved.slug} (${saved.id})`);
    return saved;
  }

  async softDelete(id: string): Promise<Product> {
    const product = await this.findById(id);
    const updated = { ...product, isPublic: false };
    const saved = await this.productRepo.save(updated);
    this.logger.log(`Product verborgen: ${saved.slug} (${saved.id})`);
    return saved;
  }

  private async getLatestStableRelease(productId: string): Promise<Release | null> {
    return this.releaseRepo.findOne({
      where: {
        productId,
        channel: ReleaseChannel.STABLE,
        status: ReleaseStatus.PUBLISHED,
      },
      order: { publishedAt: 'DESC' },
      relations: ['artifacts'],
    });
  }
}
