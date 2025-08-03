const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  roots: ['<rootDir>/src'],
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
   testPathIgnorePatterns: [
    '/src/configs/',
     '/src/middleware/logger.ts',
    '/node_modules/',
    '/dist/' // ✅ Ignore compiled JS
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',       // ✅ only collect coverage from src
    '!src/**/*.d.ts', 
    '!src/configs/**',        // ✅ Ignore config folder
    '!src/middleware/logger.ts',  // ✅ Ignore logger file
    '!src/**/*.d.ts'         // ignore type declarations
  ],
  setupFilesAfterEnv: ['./jest-setup.ts'],
  testTimeout: 20000,
};