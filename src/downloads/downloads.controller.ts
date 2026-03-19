import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { ProductsService } from '../products/products.service';
import { ReleasesService } from '../releases/releases.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { ArtifactPlatform, ArtifactArchitecture } from '../artifacts/entities/artifact.entity';
import { ReleaseChannel } from '../releases/entities/release.entity';

@ApiTags('downloads')
@Controller('products/:slug')
@UseGuards(AuthGuard)
export class DownloadsController {
  private readonly logger = new Logger(DownloadsController.name);
  private readonly licenseServiceUrl: string;
  private readonly serviceApiKey: string;

  constructor(
    private readonly productsService: ProductsService,
    private readonly releasesService: ReleasesService,
    private readonly artifactsService: ArtifactsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.licenseServiceUrl = this.configService.get<string>('LICENSE_SERVICE_URL') || '';
    this.serviceApiKey = this.configService.get<string>('SERVICE_API_KEY') || '';
  }

  @Get('download/:platform')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Download artifact', description: 'Download het artifact voor een specifiek platform' })
  @ApiParam({ name: 'slug', example: 'noveuflow' })
  @ApiParam({ name: 'platform', enum: ArtifactPlatform })
  @ApiQuery({ name: 'architecture', enum: ArtifactArchitecture, required: false })
  @ApiResponse({ status: 200, description: 'Artifact stream' })
  @ApiResponse({ status: 403, description: 'Licentie vereist' })
  @ApiResponse({ status: 404, description: 'Product of artifact niet gevonden' })
  @ApiResponse({ status: 410, description: 'Release is ingetrokken' })
  async downloadArtifact(
    @Param('slug') slug: string,
    @Param('platform') platform: ArtifactPlatform,
    @Query('architecture') architecture: ArtifactArchitecture | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const product = await this.productsService.findOneBySlug(slug);

    const latestRelease = await this.releasesService.getLatestRelease(
      product.id,
      ReleaseChannel.STABLE,
    );
    if (!latestRelease) {
      throw new NotFoundException(`Geen gepubliceerde release gevonden voor '${slug}'`);
    }

    const artifact = latestRelease.artifacts?.find((a) => {
      const platformMatch = a.platform === platform;
      const archMatch = !architecture || a.architecture === architecture;
      return platformMatch && archMatch;
    });

    if (!artifact) {
      throw new NotFoundException(
        `Geen artifact gevonden voor platform '${platform}'${architecture ? ` en architectuur '${architecture}'` : ''}`,
      );
    }

    // License validation
    const user = (req as any).user;
    if (product.requiredLicenseTier) {
      const hasLicense = await this.validateLicense(user.id, slug);
      if (!hasLicense) {
        throw new ForbiddenException(
          `Een geldige licentie is vereist om '${product.name}' te downloaden`,
        );
      }
    }

    // Stream artifact
    const { stream, headers } = await this.artifactsService.getArtifactStream(
      artifact,
      latestRelease,
    );

    Object.entries(headers).forEach(([key, value]) => {
      if (value) {
        res.setHeader(key, value);
      }
    });

    (stream as any).pipe(res);

    // Increment download count (fire-and-forget)
    this.artifactsService.incrementDownloadCount(artifact.id).catch((err) => {
      this.logger.warn(`Download count increment mislukt voor artifact ${artifact.id}: ${err.message}`);
    });
  }

  @Get('download-info')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Download informatie', description: 'Retourneert download informatie voor de portal UI' })
  @ApiParam({ name: 'slug', example: 'noveuflow' })
  @ApiResponse({ status: 200, description: 'Download informatie' })
  @ApiResponse({ status: 404, description: 'Product niet gevonden' })
  async getDownloadInfo(
    @Param('slug') slug: string,
    @Req() req: Request,
  ) {
    const product = await this.productsService.findOneBySlug(slug);
    const user = (req as any).user;

    const latestRelease = await this.releasesService.getLatestRelease(
      product.id,
      ReleaseChannel.STABLE,
    );

    const licenseInfo = await this.fetchLicenseInfo(user.id, slug);
    const hasLicense = !!licenseInfo;

    return {
      success: true,
      data: {
        hasLicense,
        product: {
          slug: product.slug,
          name: product.name,
          distributionType: product.distributionType,
          description: product.description,
        },
        release: latestRelease
          ? {
              version: latestRelease.version,
              publishedAt: latestRelease.publishedAt,
              changelog: latestRelease.changelog,
            }
          : null,
        artifacts: latestRelease?.artifacts?.map((a) => ({
          platform: a.platform,
          architecture: a.architecture,
          filename: a.filename,
          fileSize: a.fileSize,
        })) || [],
        license: licenseInfo,
      },
    };
  }

  private async validateLicense(userId: string, productSlug: string): Promise<boolean> {
    const info = await this.fetchLicenseInfo(userId, productSlug);
    return !!info;
  }

  private async fetchLicenseInfo(
    userId: string,
    productSlug: string,
  ): Promise<Record<string, any> | null> {
    if (!this.licenseServiceUrl) {
      this.logger.warn('LICENSE_SERVICE_URL niet geconfigureerd, licentie check overgeslagen');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.licenseServiceUrl}/api/v1/licenses`, {
          params: { userId, productSlug },
          headers: {
            'x-service-name': 'product-registry',
            'x-service-api-key': this.serviceApiKey,
          },
          timeout: 5000,
        }),
      );

      const licenses = response.data?.data;
      if (!licenses || !Array.isArray(licenses) || licenses.length === 0) {
        return null;
      }

      const license = licenses[0];
      return {
        tier: license.tier,
        licenseNumber: license.licenseNumber,
        validUntil: license.validUntil,
      };
    } catch (error: any) {
      this.logger.warn(`Licentie check mislukt voor user ${userId}: ${error.message}`);
      return null;
    }
  }
}
