declare module 'cors' {
  import { RequestHandler } from 'express';

  export interface CorsOptions {
    origin?:
      | boolean
      | string
      | RegExp
      | (string | RegExp)[]
      | ((
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void
        ) => void);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
    maxAge?: number;
    credentials?: boolean;
  }

  const cors: (options?: CorsOptions) => RequestHandler;

  export default cors;
}
