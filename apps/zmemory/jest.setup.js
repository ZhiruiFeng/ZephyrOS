// Jest setup file for API testing
const { TextEncoder, TextDecoder } = require('util');

// Add global variables for Jest environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Add any global test setup here
beforeEach(() => {
  // Reset any global state before each test
});

afterEach(() => {
  // Clean up after each test
});

// Add custom matchers if needed
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
});