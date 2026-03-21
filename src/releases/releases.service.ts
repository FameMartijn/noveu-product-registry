import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Release, ReleaseChannel, ReleaseStatus } from './entities/release.entity';
import { Product } from '../products/entities/product.entity';
import { Artifact, ArtifactArchitecture } from '../artifacts/entities/artifact.entity';
import { RegisterReleaseDto } from './dto/register-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';

export interface PaginatedReleases {
  data: Release[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateCheckResponse {
  name: string;
  slug: string;
  version: string;
  download_url: string;
  requires: string;
  tested: string;
  requires_php: string;
  sections: {
    changelog: string;
  };
}

export interface LatestReleaseResponse {
  version: string;
  download_url: string;
  changelog: string;
  description: string;
  tested_wp: string;
  requires_php: string;
  released_at: string;
  download_count: number;
}

@Injectable()
export class ReleasesService {
  private readonly logger = new Logger(ReleasesService.name);

  constructor(
    @InjectRepository(Release)
    private readonly releaseRepo: Repository<Release>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Artifact)
    private readonly artifactRepo: Repository<Artifact>,
    private readonly dataSource: DataSource,
  ) {}

  async findByProduct(
    productId: string,
    channel?: ReleaseChannel,
    page = 1,
    limit = 20,
  ): Promise<PaginatedReleases> {
    const where: Record<string, any> = { productId };
    if (channel) {
      where.channel = channel;
    }

    const [data, total] = await this.releaseRepo.findAndCount({
      where,
      order: { publishedAt: 'DESC' },
      relations: ['artifacts'],
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getLatestRelease(
    productId: string,
    channel: ReleaseChannel = ReleaseChannel.STABLE,
  ): Promise<Release | null> {
    return this.releaseRepo.findOne({
      where: {
        productId,
        channel,
        status: ReleaseStatus.PUBLISHED,
      },
      order: { publishedAt: 'DESC' },
      relations: ['artifacts'],
    });
  }

  async getUpdateCheckResponse(
    slug: string,
    currentVersion?: string,
  ): Promise<UpdateCheckResponse | null> {
    const product = await this.productRepo.findOne({ where: { slug } });
    if (!product) {
      throw new NotFoundException(`Product met slug '${slug}' niet gevonden`);
    }

    const latest = await this.getLatestRelease(product.id, ReleaseChannel.STABLE);
    if (!latest) {
      return null;
    }

    const baseUrl = process.env.PUBLIC_API_URL || 'https://api.noveu.eu';
    const metadata = latest.metadata || {};

    return {
      name: product.name,
      slug: product.slug,
      version: latest.version,
      download_url: `${baseUrl}/api/distribution/products/${product.slug}/download/wordpress`,
      requires: metadata.requires || '6.0',
      tested: metadata.tested || '6.5',
      requires_php: metadata.requires_php || '8.2',
      sections: {
        changelog: latest.changelog || '',
      },
    };
  }

  async getLatestReleaseResponse(
    slug: string,
  ): Promise<LatestReleaseResponse | null> {
    const product = await this.productRepo.findOne({ where: { slug } });
    if (!product) {
      throw new NotFoundException(`Product met slug '${slug}' niet gevonden`);
    }

    const latest = await this.getLatestRelease(product.id, ReleaseChannel.STABLE);
    if (!latest) {
      return null;
    }

    const baseUrl = process.env.PUBLIC_API_URL || 'https://api.noveu.eu';
    const metadata = latest.metadata || {};

    const totalDownloads = (latest.artifacts || []).reduce(
      (sum, artifact) => sum + (artifact.downloadCount || 0),
      0,
    );

    return {
      version: latest.version,
      download_url: `${baseUrl}/api/distribution/products/${product.slug}/download/wordpress`,
      changelog: latest.changelog || '',
      description:
        product.description ||
        'All-in-one appointment scheduling, CRM, and business management for service-based businesses.',
      tested_wp: metadata.tested || '6.7',
      requires_php: metadata.requires_php || '8.2',
      released_at: latest.publishedAt
        ? latest.publishedAt.toISOString()
        : '',
      download_count: totalDownloads,
    };
  }

  async registerRelease(dto: RegisterReleaseDto): Promise<Release> {
    const product = await this.productRepo.findOne({
      where: { slug: dto.productSlug },
    });
    if (!product) {
      throw new NotFoundException(`Product met slug '${dto.productSlug}' niet gevonden`);
    }

    const channel = dto.channel || ReleaseChannel.STABLE;

    const existing = await this.releaseRepo.findOne({
      where: {
        productId: product.id,
        version: dto.version,
        channel,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Release ${dto.version} (${channel}) bestaat al voor product '${dto.productSlug}'`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const release = manager.create(Release, {
        productId: product.id,
        version: dto.version,
        channel,
        status: ReleaseStatus.PUBLISHED,
        changelog: dto.changelog,
        metadata: dto.metadata,
        sourceType: dto.sourceType,
        githubRepo: dto.githubRepo,
        publishedAt: new Date(),
      });

      const savedRelease = await manager.save(Release, release);

      if (dto.artifacts && dto.artifacts.length > 0) {
        const artifacts = dto.artifacts.map((artifactDto) =>
          manager.create(Artifact, {
            releaseId: savedRelease.id,
            platform: artifactDto.platform,
            architecture: artifactDto.architecture || ArtifactArchitecture.NA,
            filename: artifactDto.filename,
            fileSize: artifactDto.fileSize,
            sha256: artifactDto.sha256,
            storageKey: artifactDto.storageKey,
            downloadUrl: artifactDto.downloadUrl,
            mimeType: artifactDto.mimeType || 'application/octet-stream',
          }),
        );

        await manager.save(Artifact, artifacts);
        savedRelease.artifacts = artifacts;
      }

      this.logger.log(
        `Release geregistreerd: ${product.slug} v${dto.version} (${channel}) met ${dto.artifacts?.length || 0} artifacts`,
      );

      return savedRelease;
    });
  }

  async addArtifact(
    releaseId: string,
    dto: import('../artifacts/dto/add-artifact.dto').AddArtifactDto,
  ): Promise<Artifact> {
    const release = await this.releaseRepo.findOne({ where: { id: releaseId } });
    if (!release) {
      throw new NotFoundException(`Release met id '${releaseId}' niet gevonden`);
    }

    const artifact = this.artifactRepo.create({
      releaseId,
      platform: dto.platform,
      architecture: dto.architecture || ArtifactArchitecture.NA,
      filename: dto.filename,
      fileSize: dto.fileSize,
      sha256: dto.sha256,
      storageKey: dto.storageKey,
      downloadUrl: dto.downloadUrl,
      mimeType: dto.mimeType || 'application/octet-stream',
    });

    const saved = await this.artifactRepo.save(artifact);
    this.logger.log(`Artifact toegevoegd aan release ${releaseId}: ${dto.filename}`);
    return saved;
  }

  async findById(id: string): Promise<Release> {
    const release = await this.releaseRepo.findOne({
      where: { id },
      relations: ['artifacts', 'product'],
    });
    if (!release) {
      throw new NotFoundException(`Release met id '${id}' niet gevonden`);
    }
    return release;
  }

  async update(id: string, dto: UpdateReleaseDto): Promise<Release> {
    const release = await this.findById(id);
    const updated = { ...release, ...dto };
    const saved = await this.releaseRepo.save(updated);
    this.logger.log(`Release bijgewerkt: ${saved.id} (v${saved.version})`);
    return saved;
  }

  async yank(id: string): Promise<Release> {
    const release = await this.findById(id);
    const yanked = { ...release, status: ReleaseStatus.YANKED };
    const saved = await this.releaseRepo.save(yanked);
    this.logger.log(`Release yanked: ${saved.id} (v${saved.version})`);
    return saved;
  }

  async findAllFiltered(filters: {
    productSlug?: string;
    channel?: ReleaseChannel;
    status?: ReleaseStatus;
  }): Promise<Release[]> {
    const qb = this.releaseRepo
      .createQueryBuilder('release')
      .leftJoinAndSelect('release.artifacts', 'artifact')
      .leftJoinAndSelect('release.product', 'product')
      .orderBy('release.publishedAt', 'DESC');

    if (filters.productSlug) {
      qb.andWhere('product.slug = :slug', { slug: filters.productSlug });
    }
    if (filters.channel) {
      qb.andWhere('release.channel = :channel', { channel: filters.channel });
    }
    if (filters.status) {
      qb.andWhere('release.status = :status', { status: filters.status });
    }

    return qb.getMany();
  }
}
