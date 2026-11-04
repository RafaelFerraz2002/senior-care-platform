import { Module } from '@nestjs/common';

import { SaudeModule } from './modulos/saude/index.js';

@Module({
  imports: [SaudeModule],
})
export class AppModule {}
