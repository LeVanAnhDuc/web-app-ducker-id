jest.mock("@/libs/logger", () => ({
  __esModule: true,
  // No-op decorator factory: keeps @LogMethod-decorated classes loadable in
  // tests (methods pass through unchanged). Real decorator behavior is covered
  // by log-method.decorator.spec.ts, which imports the actual implementation.
  LogMethod:
    () =>
    (
      _target: object,
      _propertyKey: string | symbol,
      descriptor: PropertyDescriptor
    ): PropertyDescriptor =>
      descriptor,
  Logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    debug: jest.fn(),
    stream: { write: jest.fn() }
  }
}));

jest.mock("@/constants/env", () => ({
  __esModule: true,
  default: {
    NODE_ENV: "test",
    CLIENT_URL: "http://localhost:3000",
    BASE_URL: "http://localhost:3000",
    LOG_LEVEL: "error",
    CORS_ORIGINS: ["http://localhost:3000"],
    JWT_ACCESS_SECRET: "test-access-secret",
    JWT_REFRESH_SECRET: "test-refresh-secret",
    JWT_ID_SECRET: "test-id-secret"
  }
}));
