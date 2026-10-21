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
    nodeEnv: "test",
    app: {
      clientUrl: "http://localhost:3000",
      logLevel: "error",
      corsOrigins: ["http://localhost:3000"]
    },
    jwt: {
      accessSecret: "test-access-secret",
      refreshSecret: "test-refresh-secret",
      idSecret: "test-id-secret"
    },
    // Every branch exists so a module reading a key the mock leaves out gets
    // `undefined`, as it would with a flat config, instead of a TypeError.
    db: { pool: {}, timeout: {} },
    redis: { timeout: {}, reconnect: {} },
    oidc: {},
    email: {}
  }
}));
