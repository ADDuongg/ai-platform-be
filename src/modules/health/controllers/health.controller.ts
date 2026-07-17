import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';

import { Public } from '@common/decorators';

import { HealthReport, HealthService } from '../services/health.service';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Application health check' })
  @ApiOkResponse({ description: 'Health status of application and dependencies' })
  async check(): Promise<HealthReport> {
    return this.healthService.check();
  }
}
