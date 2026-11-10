import { type DynamicModule, Module } from '@nestjs/common';

import { DatabaseModule } from './database/index.js';
import { ClockModule } from './common/clock.module.js';
import type { Config } from './config.js';
import { SaudeModule } from './modules/saude/index.js';

@Module({})
export class AppModule {
  static forRoot(config: Pick<Config, 'databaseUrl'>): DynamicModule {
    return {
      module: AppModule,
      imports: [ClockModule, DatabaseModule.forRoot(config), SaudeModule],
    };
  }
}
