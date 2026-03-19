import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DistributionType } from '../entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'noveuflow', description: 'Unieke slug voor het product (lowercase, hyphens toegestaan)' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug mag alleen lowercase letters, cijfers en hyphens bevatten',
  })
  slug: string;

  @ApiProperty({ example: 'NoveuFlow', description: 'Weergavenaam van het product' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'WordPress plugin voor workflow automation' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: DistributionType, example: DistributionType.WORDPRESS_PLUGIN })
  @IsEnum(DistributionType, {
    message: `distributionType moet een van de volgende zijn: ${Object.values(DistributionType).join(', ')}`,
  })
  distributionType: DistributionType;

  @ApiPropertyOptional({ example: 'https://cdn.noveu.eu/icons/noveuflow.png' })
  @IsOptional()
  @IsUrl({}, { message: 'iconUrl moet een geldige URL zijn' })
  iconUrl?: string;

  @ApiPropertyOptional({ default: true, description: 'Of het product publiekelijk zichtbaar is' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ example: 'professional', description: 'Minimale licentie tier vereist voor download' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  requiredLicenseTier?: string;
}
