import express, { Request, Response } from 'express';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head>
        <title>Status Page</title>
        <style>
          body {
            font-family: sans-serif;
            text-align: center;
            padding: 40px;
          }
          img {
            width: 150px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <img src="/logo.svg" alt="Logo" />
        <h1>Hello, I am alive and ready to work 🚀</h1>
      </body>
    </html>
  `);
});

export default router;