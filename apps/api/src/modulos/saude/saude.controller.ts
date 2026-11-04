import { Controller, Get, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { saudeRespostaSchema, type SaudeResposta } from '@scp/shared';

import { BaseDeDadosService } from '../../base-de-dados/index.js';

@Controller('saude')
export class SaudeController {
  constructor(private readonly baseDeDados: BaseDeDadosService) {}

  @Get()
  @ApiOperation({ operationId: 'getSaude', summary: 'Estado da API e da base de dados' })
  @ApiOkResponse({
    description: 'A API e a base de dados estão a responder.',
    standardSchema: saudeRespostaSchema,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'A API responde, mas a base de dados não.',
    standardSchema: saudeRespostaSchema,
  })
  async getSaude(): Promise<SaudeResposta> {
    if (!(await this.baseDeDados.verificarLigacao())) {
      // 503 com o mesmo corpo do contrato (SaudeResposta), para quem monitoriza a API.
      throw new ServiceUnavailableException(
        saudeRespostaSchema.parse({ estado: 'erro', baseDeDados: 'erro' }),
      );
    }
    return saudeRespostaSchema.parse({ estado: 'ok', baseDeDados: 'ok' });
  }
}
