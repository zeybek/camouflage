/** @type {import('ts-jest').JestConfigWithTsJest} */
// eslint-disable-next-line no-undef
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!**/node_modules/**',
    // extension.ts is the VS Code activation / command + UI wiring (registerCommand
    // callbacks, showQuickPick/showInputBox flows). It is exercised manually / via the
    // VS Code host rather than jest; the security-critical auto-hide path lives in
    // core/camouflage.ts, which IS covered.
    '!src/extension.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__mocks__/vscode.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  verbose: true,
};
