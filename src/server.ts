// istanbul ignore file
import dotenv from 'dotenv';
import fs from 'fs';
// Try to load .env.local first
if (fs.existsSync('./.env.local')) {
  dotenv.config({ path: './.env.local' });
  console.log('Loaded env from .env.local');
} else {
  dotenv.config(); // Load .env before anything else
}

import app from './app';
import { connectDB } from './configs/db';
import { logger } from './middleware/logger';

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });

    return server;
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
