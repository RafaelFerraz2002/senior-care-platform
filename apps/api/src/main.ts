import { createApp } from './create-app.js';
import { createLogger, NestPinoLogger } from './common/logger.js';
import { initSentry } from './common/sentry.js';
import { loadConfig } from './config.js';

const config = loadConfig(process.env);
initSentry(config);

const app = await createApp(config, new NestPinoLogger(createLogger(config.logLevel)));
app.enableShutdownHooks();
await app.listen(config.apiPort);
