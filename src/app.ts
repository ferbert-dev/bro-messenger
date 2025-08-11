import express from 'express';
import userRoutes from './routes/userRoutes';
import statusRoutes from './routes/statusRoutes';
import authRoutes from './routes/authRoutes';
import errorHandler from './middleware/errorHandler';
import { staticPath } from './middleware/staticPathImport';

const app = express();
app.use(express.json());

// Serve static files like logo.png
app.use(staticPath);

app.use('/', statusRoutes);
// Serve user-related routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 👇 Always the last middleware
app.use(errorHandler);

export default app;
