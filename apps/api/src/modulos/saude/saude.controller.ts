import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { saudeRespostaSchema, type SaudeResposta } from '@scp/shared';

@Controller('saude')
export class SaudeController {
  @Get()
  @ApiOperation({ operationId: 'getSaude', summary: 'Estado da API e da base de dados' })
  @ApiOkResponse({ description: 'A API está a responder.', standardSchema: saudeRespostaSchema })
  getSaude(): SaudeResposta {
    // A base de dados entra na Tarefa 3; por agora a resposta é fixa, mas validada pelo schema.
    return saudeRespostaSchema.parse({ estado: 'ok', baseDeDados: 'ok' });
  }
}
