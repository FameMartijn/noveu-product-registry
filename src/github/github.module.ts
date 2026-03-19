import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GitHubService } from './github.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
  ],
  providers: [GitHubService],
  exports: [GitHubService],
})
export class GithubModule {}
