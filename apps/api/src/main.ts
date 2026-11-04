import { createApp } from './criar-app.js';
import { loadConfig } from './config.js';

const config = loadConfig(process.env);

const app = await createApp(config);
app.enableShutdownHooks();
await app.listen(config.apiPort);
