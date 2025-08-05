import mongoose from 'mongoose';
import { logger } from '../middleware/logger';
export const connectDB = async (): Promise<void> => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('Missing MONGO_URI');
  }
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('✅ MongoDB connected');
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    throw error;
  }
};
