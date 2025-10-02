import express from 'express';
import userRoutes from './routes/userRoutes';
import statusRoutes from './routes/statusRoutes';
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import errorHandler from './middleware/errorHandler';
import { staticPath } from './middleware/staticPathImport';

const app = express();

// 🔓 Wide-open CORS (NOT for production!)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // allow everything
  res.header(
    'Access-Control-Allow-Methods',
    'GET,PUT,POST,PATCH,DELETE,OPTIONS',
  );
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200); // quick reply to preflight
  }
  next();
});

app.use(express.json());

// Serve static files like logo.png
app.use(staticPath);

app.use('/', statusRoutes);

// Serve user-related routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use(errorHandler);

export default app;
