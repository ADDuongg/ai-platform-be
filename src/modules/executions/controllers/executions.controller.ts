import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, JwtPayload, Permissions } from '@common/decorators';
import { PERMISSIONS } from '@common/constants';

import { CreateExecutionDto } from '../dto/execute-workflow.dto';
import { ExecutionResponseDto } from '../dto/execution-response.dto';
import { ExecutionStepResponseDto } from '../dto/execution-step-response.dto';
import { ListExecutionsQueryDto } from '../dto/list-executions-query.dto';
import { ExecutionsService } from '../services/executions.service';

@ApiTags('Executions')
@ApiBearerAuth('JWT')
@Controller({ path: 'executions', version: '1' })
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post()
  @Permissions(PERMISSIONS.EXECUTIONS.CREATE)
  @ApiOperation({ summary: 'Start Execution' })
  @ApiCreatedResponse({ type: ExecutionResponseDto })
  async create(
    @Body() dto: CreateExecutionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExecutionResponseDto> {
    return this.executionsService.startFromBody(dto, user.sub);
  }

  @Get()
  @Permissions(PERMISSIONS.EXECUTIONS.READ)
  @ApiOperation({ summary: 'List Executions' })
  async list(
    @Query() query: ListExecutionsQueryDto,
  ): Promise<{ data: ExecutionResponseDto[]; meta: Record<string, number> }> {
    return this.executionsService.list(query);
  }

  @Get(':id/steps')
  @Permissions(PERMISSIONS.EXECUTIONS.READ)
  @ApiOperation({ summary: 'List Execution steps' })
  @ApiOkResponse({ type: [ExecutionStepResponseDto] })
  async listSteps(@Param('id', ParseUUIDPipe) id: string): Promise<ExecutionStepResponseDto[]> {
    return this.executionsService.listSteps(id);
  }

  @Get(':id/steps/:stepId')
  @Permissions(PERMISSIONS.EXECUTIONS.READ)
  @ApiOperation({ summary: 'Get Execution step' })
  @ApiOkResponse({ type: ExecutionStepResponseDto })
  async getStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ): Promise<ExecutionStepResponseDto> {
    return this.executionsService.getStep(id, stepId);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.EXECUTIONS.READ)
  @ApiOperation({ summary: 'Get Execution by id' })
  @ApiOkResponse({ type: ExecutionResponseDto })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ExecutionResponseDto> {
    return this.executionsService.findById(id);
  }

  @Post(':id/cancel')
  @Permissions(PERMISSIONS.EXECUTIONS.CANCEL)
  @ApiOperation({ summary: 'Cancel Execution' })
  @ApiOkResponse({ type: ExecutionResponseDto })
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<ExecutionResponseDto> {
    return this.executionsService.cancel(id);
  }

  @Post(':id/retry')
  @Permissions(PERMISSIONS.EXECUTIONS.RETRY)
  @ApiOperation({ summary: 'Retry failed Execution' })
  @ApiOkResponse({ type: ExecutionResponseDto })
  async retry(@Param('id', ParseUUIDPipe) id: string): Promise<ExecutionResponseDto> {
    return this.executionsService.retry(id);
  }
}
