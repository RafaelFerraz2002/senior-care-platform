import { type DynamicModule, Module } from '@nestjs/common';

import { BaseDeDadosModule } from './base-de-dados/index.js';
import { RelogioModule } from './common/relogio.module.js';
import type { Config } from './config.js';
import { SaudeModule } from './modulos/saude/index.js';

@Module({})
export class AppModule {
  static forRoot(config: Pick<Config, 'databaseUrl'>): DynamicModule {
    return {
      module: AppModule,
      imports: [RelogioModule, BaseDeDadosModule.forRoot(config), SaudeModule],
    };
  }
}
