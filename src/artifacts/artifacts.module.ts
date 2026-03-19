import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Artifact } from './entities/artifact.entity';
import { ArtifactsService } from './artifacts.service';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Artifact]),
    GithubModule,
  ],
  providers: [ArtifactsService],
  exports: [ArtifactsService, TypeOrmModule],
})
export class ArtifactsModule {}
