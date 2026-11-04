import { createApp } from './criar-app.js';

const porta = 3000;

const app = await createApp();
await app.listen(porta);
