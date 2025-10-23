import express from 'express';
import userRoutes from './routes/userRoutes';
import statusRoutes from './routes/statusRoutes';
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import errorHandler from './middleware/errorHandler';
import { staticPath } from './middleware/staticPathImport';
import { ensureUploadsDir, uploadsDir } from './utils/avatarStorage';
import { applySecurity } from './security';
import { parseCsv } from './utils/parsers';
import { authenticateToken } from './middleware/authMiddleware';
import { logger } from './utils/logger';

const app = express();

const isProd = process.env.NODE_ENV === 'production';

const devWebFallback = [
  'http://localhost:3005',
  'http://localhost:5173',
  'http://api:3005',
];
const envWebOrigins = parseCsv(process.env.SECURITY_WEB_ORIGINS);
const webOrigins =
  envWebOrigins.length > 0 ? envWebOrigins : isProd ? [] : devWebFallback;

applySecurity(app, {
  webOrigins,
  apiOrigins: parseCsv(process.env.SECURITY_API_ORIGINS),
  wsOrigins: parseCsv(process.env.SECURITY_WS_ORIGINS),
  scriptCdn: parseCsv(process.env.SECURITY_SCRIPT_CDN),
  styleCdn: parseCsv(process.env.SECURITY_STYLE_CDN),
  imgCdn: parseCsv(process.env.SECURITY_IMG_CDN),
  jsonLimit: process.env.SECURITY_JSON_LIMIT ?? undefined,
  isProd,
});

// Serve static files like logo.png
app.use(staticPath);
ensureUploadsDir().catch((error) => {
  // eslint-disable-next-line no-console
  logger.info('Failed to prepare uploads directory', error);
});
app.use('/uploads', authenticateToken, express.static(uploadsDir));

app.use('/', statusRoutes);

// Serve user-related routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use(errorHandler);

export default app;
