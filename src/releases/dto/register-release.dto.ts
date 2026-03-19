import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReleaseChannel, SourceType } from '../entities/release.entity';
import { AddArtifactDto } from '../../artifacts/dto/add-artifact.dto';

export class RegisterReleaseDto {
  @ApiProperty({ example: 'noveuflow', description: 'Product slug' })
  @IsString()
  @MaxLength(100)
  productSlug: string;

  @ApiProperty({ example: '1.2.0', description: 'Semantic version string' })
  @IsString()
  @MaxLength(50)
  @Matches(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/, {
    message: 'Version moet een geldig semver formaat zijn (bijv. 1.2.0 of 1.2.0-beta.1)',
  })
  version: string;

  @ApiPropertyOptional({ enum: ReleaseChannel, default: ReleaseChannel.STABLE })
  @IsOptional()
  @IsEnum(ReleaseChannel, {
    message: `channel moet een van de volgende zijn: ${Object.values(ReleaseChannel).join(', ')}`,
  })
  channel?: ReleaseChannel;

  @ApiPropertyOptional({ example: '## Changelog\n- Nieuwe feature X\n- Bugfix Y' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  changelog?: string;

  @ApiPropertyOptional({
    example: { requires: '6.0', tested: '6.5', requires_php: '8.2' },
    description: 'Extra metadata (bijv. WordPress vereisten)',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ enum: SourceType, description: 'Bron van de release artifacts' })
  @IsEnum(SourceType, {
    message: `sourceType moet een van de volgende zijn: ${Object.values(SourceType).join(', ')}`,
  })
  sourceType: SourceType;

  @ApiPropertyOptional({ example: 'NoveuSolutions/NoveuFlow', description: 'GitHub repository pad' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  githubRepo?: string;

  @ApiProperty({ type: [AddArtifactDto], description: 'Lijst van build artifacts' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddArtifactDto)
  artifacts: AddArtifactDto[];
}
