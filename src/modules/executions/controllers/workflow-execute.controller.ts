import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtPayload, Permissions } from '@common/decorators';
import { PERMISSIONS } from '@common/constants';

import { ExecuteWorkflowDto } from '../dto/execute-workflow.dto';
import { ExecutionResponseDto } from '../dto/execution-response.dto';
import { ExecutionsService } from '../services/executions.service';

@ApiTags('Executions')
@ApiBearerAuth('JWT')
@Controller({ path: 'workflows', version: '1' })
export class WorkflowExecuteController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post(':id/execute')
  @Permissions(PERMISSIONS.WORKFLOWS.EXECUTE)
  @ApiOperation({ summary: 'Execute published Workflow' })
  @ApiCreatedResponse({ type: ExecutionResponseDto })
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteWorkflowDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExecutionResponseDto> {
    return this.executionsService.startFromWorkflow(id, dto, user.sub);
  }
}
