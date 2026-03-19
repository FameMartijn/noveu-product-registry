import {
  Injectable,
  Logger,
  GoneException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Artifact } from './entities/artifact.entity';
import { Release, ReleaseStatus, SourceType } from '../releases/entities/release.entity';
import { GitHubService } from '../github/github.service';

const CACHE_BASE_DIR = process.env.ARTIFACT_CACHE_DIR || '/var/cache/noveu-artifacts';

@Injectable()
export class ArtifactsService {
  private readonly logger = new Logger(ArtifactsService.name);

  constructor(
    @InjectRepository(Artifact)
    private readonly artifactRepo: Repository<Artifact>,
    private readonly githubService: GitHubService,
  ) {}

  async getArtifactStream(
    artifact: Artifact,
    release: Release,
  ): Promise<{ stream: NodeJS.ReadableStream; headers: Record<string, string> }> {
    if (release.status === ReleaseStatus.YANKED) {
      throw new GoneException('Deze release is ingetrokken en niet meer beschikbaar');
    }

    const cachePath = path.join(CACHE_BASE_DIR, release.id, artifact.filename);

    // Check cache first
    if (fs.existsSync(cachePath)) {
      this.logger.debug(`Cache hit: ${cachePath}`);
      const stream = fs.createReadStream(cachePath);
      const stat = fs.statSync(cachePath);
      return {
        stream,
        headers: {
          'Content-Type': artifact.mimeType || 'application/octet-stream',
          'Content-Length': String(stat.size),
          'Content-Disposition': `attachment; filename="${artifact.filename}"`,
        },
      };
    }

    // Fallback to source
    if (release.sourceType === SourceType.GITHUB && release.githubRepo) {
      return this.fetchFromGitHub(artifact, release, cachePath);
    }

    if (artifact.downloadUrl) {
      throw new HttpException(
        'Externe URL downloads worden nog niet ondersteund via streaming',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }

    throw new NotFoundException(
      `Artifact '${artifact.filename}' kan niet worden opgehaald: onbekende bron`,
    );
  }

  async incrementDownloadCount(artifactId: string): Promise<void> {
    await this.artifactRepo
      .createQueryBuilder()
      .update(Artifact)
      .set({ downloadCount: () => 'download_count + 1' })
      .where('id = :id', { id: artifactId })
      .execute();
  }

  async invalidateCache(releaseId: string): Promise<void> {
    const cacheDir = path.join(CACHE_BASE_DIR, releaseId);
    try {
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        this.logger.log(`Cache verwijderd voor release ${releaseId}`);
      }
    } catch (error: any) {
      this.logger.warn(`Kon cache niet verwijderen voor release ${releaseId}: ${error.message}`);
    }
  }

  async findById(id: string): Promise<Artifact> {
    const artifact = await this.artifactRepo.findOne({
      where: { id },
      relations: ['release'],
    });
    if (!artifact) {
      throw new NotFoundException(`Artifact met id '${id}' niet gevonden`);
    }
    return artifact;
  }

  private async fetchFromGitHub(
    artifact: Artifact,
    release: Release,
    cachePath: string,
  ): Promise<{ stream: NodeJS.ReadableStream; headers: Record<string, string> }> {
    this.logger.debug(`Fetching from GitHub: ${release.githubRepo} - ${artifact.filename}`);

    const ghRelease = await this.githubService.getLatestRelease(
      release.githubRepo,
      artifact.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    );

    const download = await this.githubService.downloadAsset(
      release.githubRepo,
      ghRelease.assetId,
    );

    // Save to cache in background
    this.saveToCacheAsync(download.stream, cachePath);

    return {
      stream: download.stream,
      headers: {
        'Content-Type': artifact.mimeType || download.headers['Content-Type'] || 'application/octet-stream',
        'Content-Length': download.headers['Content-Length'] || '',
        'Content-Disposition': `attachment; filename="${artifact.filename}"`,
      },
    };
  }

  private saveToCacheAsync(sourceStream: NodeJS.ReadableStream, cachePath: string): void {
    try {
      const cacheDir = path.dirname(cachePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(cachePath);
      (sourceStream as any).pipe(writeStream);

      writeStream.on('error', (err) => {
        this.logger.warn(`Cache write fout voor ${cachePath}: ${err.message}`);
        try {
          fs.unlinkSync(cachePath);
        } catch {
          // ignore cleanup errors
        }
      });

      writeStream.on('finish', () => {
        this.logger.debug(`Cached: ${cachePath}`);
      });
    } catch (error: any) {
      this.logger.warn(`Kon cache niet schrijven voor ${cachePath}: ${error.message}`);
    }
  }
}
