import { Controller, Get, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { saudeResponseSchema, type SaudeResponse } from '@scp/shared';

import { DatabaseService } from '../../database/index.js';

@Controller('saude')
export class SaudeController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @ApiOperation({ operationId: 'getSaude', summary: 'Estado da API e da base de dados' })
  @ApiOkResponse({
    description: 'A API e a base de dados estão a responder.',
    standardSchema: saudeResponseSchema,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'A API responde, mas a base de dados não.',
    standardSchema: saudeResponseSchema,
  })
  async getSaude(): Promise<SaudeResponse> {
    if (!(await this.database.checkConnection())) {
      // 503 com o mesmo corpo do contrato (SaudeResponse), para quem monitoriza a API.
      throw new ServiceUnavailableException(
        saudeResponseSchema.parse({ status: 'error', database: 'error' }),
      );
    }
    return saudeResponseSchema.parse({ status: 'ok', database: 'ok' });
  }
}
