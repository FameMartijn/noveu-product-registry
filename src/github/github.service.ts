import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface GitHubReleaseInfo {
  version: string;
  publishedAt: string;
  body: string;
  assetId: number;
  assetName: string;
}

export interface GitHubAssetDownload {
  stream: NodeJS.ReadableStream;
  headers: Record<string, string>;
}

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);
  private readonly githubToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.githubToken = this.configService.get<string>('GITHUB_PAT') || '';
    if (!this.githubToken) {
      this.logger.warn('GITHUB_PAT is not defined. GitHub release operations will fail.');
    }
  }

  /**
   * Fetches the latest release information from a GitHub repository.
   * @param repo Full repository path (e.g., "FameMartijn/Mobiliteit-Connect")
   * @param assetNamePattern Optional pattern to match a specific asset by name
   */
  async getLatestRelease(repo: string, assetNamePattern?: string): Promise<GitHubReleaseInfo> {
    try {
      const url = `https://api.github.com/repos/${repo}/releases/latest`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `token ${this.githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Noveu-Product-Registry',
          },
        }),
      );

      const release = response.data;

      let asset: any;
      if (assetNamePattern) {
        const pattern = new RegExp(assetNamePattern, 'i');
        asset = release.assets?.find((a: any) => pattern.test(a.name));
      } else {
        asset = release.assets?.[0];
      }

      if (!asset) {
        throw new Error(
          `No matching asset found in latest release of ${repo}` +
            (assetNamePattern ? ` (pattern: ${assetNamePattern})` : ''),
        );
      }

      return {
        version: release.tag_name,
        publishedAt: release.published_at,
        body: release.body || '',
        assetId: asset.id,
        assetName: asset.name,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch latest GitHub release for ${repo}: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to check for updates from GitHub (${repo}).`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Streams a release asset from GitHub.
   * @param repo Full repository path (e.g., "FameMartijn/Mobiliteit-Connect")
   * @param assetId The GitHub asset ID to download
   */
  async downloadAsset(repo: string, assetId: number): Promise<GitHubAssetDownload> {
    try {
      const url = `https://api.github.com/repos/${repo}/releases/assets/${assetId}`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `token ${this.githubToken}`,
            Accept: 'application/octet-stream',
            'User-Agent': 'Noveu-Product-Registry',
          },
          responseType: 'stream',
        }),
      );

      return {
        stream: response.data,
        headers: {
          'Content-Type': response.headers['content-type'] || 'application/octet-stream',
          'Content-Length': response.headers['content-length'] || '',
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to download GitHub release asset ${assetId} from ${repo}: ${error.message}`);
      throw new HttpException(
        `Failed to stream asset from GitHub (${repo}).`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
