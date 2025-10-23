import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { logger } from './logger';

const DEFAULT_MAX_FILE_BYTES = 12 * 1024 * 1024; // 12MB fallback

const byteMultipliers: Record<string, number> = {
  b: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
};

function parseByteLimit(raw?: string): number | null {
  if (!raw) return null;
  const match = raw
    .trim()
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)(?:\s*(b|kb|mb|gb))?$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (Number.isNaN(value) || value <= 0) return null;
  const unit = match[2] ?? 'b';
  const multiplier = byteMultipliers[unit];
  if (!multiplier) return null;
  return Math.floor(value * multiplier);
}

const MAX_FILE_BYTES =
  parseByteLimit(process.env.SECURITY_AVATAR_MAX_BYTES) ?? DEFAULT_MAX_FILE_BYTES;

export const uploadsDir = path.join(process.cwd(), 'uploads');

export async function ensureUploadsDir() {
  await fsPromises.mkdir(uploadsDir, { recursive: true });
}

const mimeExtensionMap: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

type ImageWriterMessage = {
  ok: boolean;
  error?: string;
};

function resolveWorkerConfig(): { script: string; execArgv: string[] } {
  const jsPath = path.resolve(__dirname, 'imageWriterWorker.js');
  if (fs.existsSync(jsPath)) {
    return { script: jsPath, execArgv: [] };
  }

  const tsPath = path.resolve(__dirname, 'imageWriterWorker.ts');
  if (fs.existsSync(tsPath)) {
    let tsNodeRegister: string;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      tsNodeRegister = require.resolve('ts-node/register');
    } catch (error) {
      throw new Error(
        'imageWriterWorker.ts found but ts-node/register is unavailable. Install ts-node or build the project.',
      );
    }

    return {
      script: tsPath,
      execArgv: ['-r', tsNodeRegister],
    };
  }

  throw new Error('Image writer worker script not found. Ensure the project is built.');
}

async function writeFileWithWorker(absolutePath: string, buffer: Buffer) {
  const { script, execArgv } = resolveWorkerConfig();

  await new Promise<void>((resolve, reject) => {
    const worker = new Worker(script, {
      workerData: { absolutePath, buffer },
      execArgv,
    });
    logger.info('[avatarWorker] spawned', worker.threadId, absolutePath);
    worker.once('message', msg => logger.info('[avatarWorker] done', msg));
    const cleanup = () => {
      worker.removeAllListeners();
    };

    worker.once('message', (message: ImageWriterMessage) => {
      cleanup();
      if (message.ok) {
        resolve();
      } else {
        reject(new Error(message.error ?? 'Image writer worker reported an error'));
      }
    });

    worker.once('error', (error) => {
      cleanup();
      reject(error);
    });

    worker.once('exit', (code) => {
      cleanup();
      if (code !== 0) {
        reject(new Error(`Image writer worker exited with code ${code}`));
      }
    });
  });
}

export async function saveBase64Image(
  dataUri: string,
  prefix: string,
): Promise<{ relativePath: string; absolutePath: string }> {
  await ensureUploadsDir();

  const match = dataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data');
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const ext = mimeExtensionMap[mimeType];
  if (!ext) {
    throw new Error('Unsupported image type');
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty image data');
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error('Image too large');
  }

  const fileName = `${prefix}-${Date.now()}.${ext}`;
  const absolutePath = path.join(uploadsDir, fileName);
  await writeFileWithWorker(absolutePath, buffer);

  return {
    relativePath: `/uploads/${fileName}`,
    absolutePath,
  };
}

export function deleteFileIfExists(relativePath?: string | null) {
  if (!relativePath) return;
  if (!relativePath.startsWith('/uploads/')) return;
  const sanitized = relativePath.replace(/^\//, '');
  const absolutePath = path.join(process.cwd(), sanitized);
  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (err) {
      // ignore unlink errors
    }
  }
}
