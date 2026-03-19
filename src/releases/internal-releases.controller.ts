import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InternalServiceGuard } from '../common/guards/internal-service.guard';
import { ReleasesService } from './releases.service';
import { RegisterReleaseDto } from './dto/register-release.dto';
import { AddArtifactDto } from '../artifacts/dto/add-artifact.dto';

@ApiTags('internal')
@Controller('internal/releases')
@UseGuards(InternalServiceGuard)
export class InternalReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Post()
  @ApiOperation({ summary: 'Registreer een nieuwe release (intern)', description: 'Wordt aangeroepen door CI/CD pipeline' })
  @ApiResponse({ status: 201, description: 'Release geregistreerd' })
  @ApiResponse({ status: 404, description: 'Product niet gevonden' })
  @ApiResponse({ status: 409, description: 'Release versie bestaat al' })
  async registerRelease(@Body() dto: RegisterReleaseDto) {
    const release = await this.releasesService.registerRelease(dto);
    return {
      success: true,
      data: release,
    };
  }

  @Post(':id/artifacts')
  @ApiOperation({ summary: 'Voeg artifact toe aan release (intern)', description: 'Voegt een artifact toe aan een bestaande release' })
  @ApiParam({ name: 'id', description: 'Release UUID' })
  @ApiResponse({ status: 201, description: 'Artifact toegevoegd' })
  @ApiResponse({ status: 404, description: 'Release niet gevonden' })
  async addArtifact(
    @Param('id') releaseId: string,
    @Body() dto: AddArtifactDto,
  ) {
    const artifact = await this.releasesService.addArtifact(releaseId, dto);
    return {
      success: true,
      data: artifact,
    };
  }
}
