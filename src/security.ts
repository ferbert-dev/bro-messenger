// security.ts
import type { Express } from 'express';
import express from 'express';
import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import rateLimit from 'express-rate-limit';

type SecurityOptions = {
  /** Frontends allowed via CORS and CSP (https origins only) */
  webOrigins: string[];
  /** REST/gRPC endpoints you call from the browser (https origins) */
  apiOrigins?: string[];
  /** WebSocket endpoints (ws/wss origins) */
  wsOrigins?: string[];
  /** Extra CDNs (script/style/img) if you use them */
  scriptCdn?: string[];
  styleCdn?: string[];
  imgCdn?: string[];
  jsonLimit?: string;
  isProd?: boolean;
};

export function applySecurity(
  app: Express,
  {
    webOrigins,
    apiOrigins = [],
    wsOrigins = [],
    scriptCdn = [],
    styleCdn = [],
    imgCdn = [],
    jsonLimit = '100kb',
    isProd = process.env.NODE_ENV === 'production',
  }: SecurityOptions
) {
  const trustProxyEnv = process.env.SECURITY_TRUST_PROXY;
  if (trustProxyEnv) {
    const normalized =
      trustProxyEnv.toLowerCase() === 'false'
        ? false
        : trustProxyEnv.toLowerCase() === 'true'
        ? 1
        : trustProxyEnv;
    app.set('trust proxy', normalized);
  } else if (isProd) {
    app.set('trust proxy', 1);
  }
  app.disable('x-powered-by');

  // CORS (frontends that are allowed to call API) 
  const allowlist = new Set(webOrigins);
  const corsOptions: CorsOptions = {
    credentials: true,
    origin(
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void
    ) {
      if (!origin) return cb(null, true); // same-origin/curl
      return allowlist.has(origin) ? cb(null, true) : cb(new Error('CORS blocked'));
    },
  };
  app.use(cors(corsOptions));

  // Helmet CSP
  const connectSrc = [
    "'self'",
    ...webOrigins,
    ...apiOrigins,
    ...wsOrigins, // must include wss://... for websockets
  ];
  const imgSrc = ["'self'", 'data:', ...imgCdn];
  const scriptSrc = ["'self'", ...scriptCdn];
  const styleSrc = ["'self'", "'unsafe-inline'", ...styleCdn]; 

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "base-uri": ["'self'"],
          "img-src": imgSrc,
          "script-src": scriptSrc,
          "style-src": styleSrc,
          "connect-src": connectSrc,
        },
      },
      hsts: isProd ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
      noSniff: true,
    })
  );

  // ----- Body limit + rate limit -----
  app.use(express.json({ limit: jsonLimit }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.' },
    })
  );
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
});
