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
    '/dist/' // Ignore compiled JS
  ],
  collectCoverageFrom: [
    'src/controllers/**/*.ts',
    '!src/controllers/authController.ts',
    '!src/controllers/chatController.ts',
    'src/services/userService.ts',
    'src/services/authService.ts',
    'src/middleware/**/*.ts',
    '!src/middleware/staticPathImport.ts',
    '!src/middleware/logger.ts',
  ],
  setupFilesAfterEnv: ['./jest-setup.ts'],
  testTimeout: 20000,
};
