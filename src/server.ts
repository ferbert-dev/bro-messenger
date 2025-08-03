// istanbul ignore file
import dotenv from 'dotenv';
dotenv.config();  // Load .env before anything else
import app from './app';
import {connectDB} from './configs/db'
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