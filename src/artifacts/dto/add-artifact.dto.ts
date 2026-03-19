import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArtifactPlatform, ArtifactArchitecture } from '../entities/artifact.entity';

export class AddArtifactDto {
  @ApiProperty({ enum: ArtifactPlatform, example: ArtifactPlatform.WORDPRESS })
  @IsEnum(ArtifactPlatform, {
    message: `platform moet een van de volgende zijn: ${Object.values(ArtifactPlatform).join(', ')}`,
  })
  platform: ArtifactPlatform;

  @ApiPropertyOptional({ enum: ArtifactArchitecture, default: ArtifactArchitecture.NA })
  @IsOptional()
  @IsEnum(ArtifactArchitecture, {
    message: `architecture moet een van de volgende zijn: ${Object.values(ArtifactArchitecture).join(', ')}`,
  })
  architecture?: ArtifactArchitecture;

  @ApiProperty({ example: 'noveuflow-1.2.0.zip' })
  @IsString()
  @MaxLength(500)
  filename: string;

  @ApiPropertyOptional({ example: 1048576, description: 'Bestandsgrootte in bytes' })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ example: 'a1b2c3d4e5f6...' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sha256?: string;

  @ApiPropertyOptional({ example: 'releases/noveuflow/1.2.0/noveuflow-1.2.0.zip' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  storageKey?: string;

  @ApiPropertyOptional({ example: 'https://github.com/.../noveuflow-1.2.0.zip' })
  @IsOptional()
  @IsUrl({}, { message: 'downloadUrl moet een geldige URL zijn' })
  downloadUrl?: string;

  @ApiPropertyOptional({ example: 'application/zip', default: 'application/octet-stream' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;
}
