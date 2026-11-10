import { type DynamicModule, Global, Module } from '@nestjs/common';

import { DATABASE_URL_TOKEN, DatabaseService } from './database.service.js';

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(config: { databaseUrl: string }): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: DATABASE_URL_TOKEN, useValue: config.databaseUrl }, DatabaseService],
      exports: [DatabaseService],
    };
  }
}
