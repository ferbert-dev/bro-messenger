import { initialize } from './chat.handlers.js';

initialize().catch((err) => {
  console.error('Failed to initialize chat', err);
});
