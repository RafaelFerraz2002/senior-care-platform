import { Global, Module } from '@nestjs/common';

import { Relogio, RelogioSistema } from './relogio.js';

/** Disponibiliza o `Relogio` a toda a aplicação; os testes substituem-no por um `RelogioDeTeste`. */
@Global()
@Module({
  providers: [{ provide: Relogio, useClass: RelogioSistema }],
  exports: [Relogio],
})
export class RelogioModule {}
