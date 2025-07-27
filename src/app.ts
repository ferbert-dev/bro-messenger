import express from 'express';
import userRoutes from './routes/userRoutes';
import statusRoutes from './routes/statusRoutes';
import errorHandler from './middleware/errorHandler';
import {staticPath as stpa} from './middleware/staticPathImport';

const app = express();
app.use(express.json());

// Serve static files like logo.png
app.use(stpa);
//app.use(express.static(path.join(__dirname, '..', 'public')));
// Basic route for testing if the server is running
app.use('/', statusRoutes);

// Serve user-related routes
app.use('/api/users', userRoutes);

// 👇 Always the last middleware
app.use(errorHandler);

export default app;