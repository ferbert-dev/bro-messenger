import dotenv from 'dotenv';
import app from './app';
import {connectDB} from './configs/db'
dotenv.config();

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});