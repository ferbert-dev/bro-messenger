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
import http from "http";
import app from './app';
import { connectDB } from './configs/db';
import { logger } from './utils/logger';
import { initWebSocket } from './services/wsService';

const PORT = process.env.PORT || 3001;

const startServer = async () => {

  try {
    await connectDB();
     // Create HTTP server from Express app
    const server = http.createServer(app);
    
     // Init WebSocket server (separate module)
     initWebSocket(server); //initializes and stores internally

    server.listen(PORT, () => {
       logger.info(`🚀 HTTP+WS listening on http://localhost:${PORT}`);
    });
    return server;

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
