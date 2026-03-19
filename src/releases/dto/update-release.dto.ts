import { IsString, IsEnum, IsOptional, IsObject, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReleaseStatus } from '../entities/release.entity';

export class UpdateReleaseDto {
  @ApiPropertyOptional({ enum: ReleaseStatus })
  @IsOptional()
  @IsEnum(ReleaseStatus, {
    message: `status moet een van de volgende zijn: ${Object.values(ReleaseStatus).join(', ')}`,
  })
  status?: ReleaseStatus;

  @ApiPropertyOptional({ example: '## Updated changelog' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  changelog?: string;

  @ApiPropertyOptional({ example: { requires: '6.0', tested: '6.6' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
