import fs from 'fs';
import path from 'path';

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB

export const uploadsDir = path.join(process.cwd(), 'uploads');

export function ensureUploadsDir() {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const mimeExtensionMap: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

export function saveBase64Image(
  dataUri: string,
  prefix: string,
): { relativePath: string; absolutePath: string } {
  ensureUploadsDir();

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
  fs.writeFileSync(absolutePath, buffer);

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
