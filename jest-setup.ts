import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer;

// Increase Jest timeout for this file to avoid timeouts (at the top)
jest.setTimeout(60000); // 30 seconds, adjust as needed

beforeAll(async () => {
  console.log('✅ MongoDB In‑Memory Server is starting…');
  mongo = await MongoMemoryServer.create({
    binary: {
      downloadDir: './.mongodb-binaries',
      version: '6.0.6',
    },
  });

  const uri = mongo.getUri();

  try {
    // mongoose.connect() returns a promise that resolves when connected [oai_citation:3‡mongoosejs.com](https://mongoosejs.com/docs/6.x/docs/connections.html#:~:text=You%20can%20connect%20to%20MongoDB,method)
    await mongoose.connect(uri);
    console.log('✅ MongoDB In‑Memory Server is ready');
  } catch (err) {
    console.error('❌ Failed to connect to in‑memory MongoDB:', err);
    throw err;
  }

  // If you want to catch runtime errors after the initial connection,
  // you can still listen for mongoose.connection.on('error', …).
});

afterEach(async () => {
  const db = mongoose.connection.db;
  if (!db) return;

  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});