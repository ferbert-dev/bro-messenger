import fs from 'fs/promises';
import { parentPort, workerData } from 'worker_threads';

type WorkerPayload = {
  absolutePath: string;
  buffer: Buffer;
};

async function run() {
  if (!parentPort) {
    throw new Error('worker_threads parentPort not available');
  }

  try {
    const { absolutePath, buffer } = workerData as WorkerPayload;
    await fs.writeFile(absolutePath, buffer);
    parentPort.postMessage({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    parentPort.postMessage({ ok: false, error: message });
  }
}

void run();
