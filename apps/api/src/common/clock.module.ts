import { Global, Module } from '@nestjs/common';

import { Clock, SystemClock } from './clock.js';

/** Disponibiliza o `Clock` a toda a aplicação; os testes substituem-no por um `TestClock`. */
@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class ClockModule {}
