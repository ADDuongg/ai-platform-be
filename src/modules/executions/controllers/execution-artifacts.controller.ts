import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { Permissions } from '@common/decorators';
import { PERMISSIONS } from '@common/constants';

import { ExecutionArtifactResponseDto } from '../dto/execution-artifact-response.dto';
import { ExecutionArtifactsService } from '../services/execution-artifacts.service';

@ApiTags('ExecutionArtifacts')
@ApiBearerAuth('JWT')
@Controller({ path: 'executions', version: '1' })
export class ExecutionArtifactsController {
  constructor(private readonly artifactsService: ExecutionArtifactsService) {}

  @Get(':executionId/artifacts')
  @Permissions(PERMISSIONS.EXECUTIONS.READ)
  @ApiOperation({ summary: 'List Execution artifacts' })
  @ApiOkResponse({ type: [ExecutionArtifactResponseDto] })
  async list(
    @Param('executionId', ParseUUIDPipe) executionId: string,
  ): Promise<{ data: ExecutionArtifactResponseDto[] }> {
    const data = await this.artifactsService.list(executionId);
    return { data };
  }

  @Get(':executionId/artifacts/:artifactId/content')
  @Permissions(PERMISSIONS.EXECUTIONS.READ)
  @ApiOperation({ summary: 'Download or view artifact content' })
  @ApiProduces('application/json', 'application/octet-stream', 'image/png', 'image/jpeg')
  async getContent(
    @Param('executionId', ParseUUIDPipe) executionId: string,
    @Param('artifactId', ParseUUIDPipe) artifactId: string,
    @Query('item') itemRaw: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, unknown> | StreamableFile> {
    const item =
      itemRaw !== undefined && itemRaw !== '' && Number.isFinite(Number(itemRaw))
        ? Number(itemRaw)
        : undefined;
    const result = await this.artifactsService.getContent(executionId, artifactId, item);

    if (result.kind === 'json') {
      return result.body;
    }

    if (result.kind === 'buffer') {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Length', String(result.byteSize));
      return new StreamableFile(result.buffer);
    }

    res.setHeader('Content-Type', result.contentType);
    if (result.byteSize != null) {
      res.setHeader('Content-Length', String(result.byteSize));
    }
    return new StreamableFile(result.stream);
  }
}
