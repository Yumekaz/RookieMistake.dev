/* eslint-disable @typescript-eslint/no-require-imports */
describe('Config validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads a valid config with derived CORS origins', () => {
    process.env.PORT = '3001';
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGINS = 'http://localhost:3000,https://example.com';

    const { config } = require('../../src/config');

    expect(config.port).toBe(3001);
    expect(config.nodeEnv).toBe('test');
    expect(config.corsOrigins).toEqual(['http://localhost:3000', 'https://example.com']);
  });

  it('throws when config values are invalid', () => {
    process.env.PORT = '99999';

    expect(() => {
      require('../../src/config');
    }).toThrow(/PORT/);
  });
});
