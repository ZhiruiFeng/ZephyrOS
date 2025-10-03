/**
 * Jest Test Setup
 * This file runs before all tests to configure the testing environment
 */

import '@testing-library/jest-dom';

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.ZMEMORY_API_URL = 'http://localhost:3000/api';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Global test utilities
(global as any).testUtils = {
  mockDate: (date: string) => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  },
  restoreDate: () => {
    jest.useRealTimers();
  },
};

// Extend Jest matchers if needed
expect.extend({
  // Custom matchers can be added here
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
