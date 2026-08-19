// others
import { Logger } from "./index";
import { RequestContext } from "@/utils/request-context";

export interface LogMethodOptions {
  name?: string;
  level?: "info" | "debug";
}

export function LogMethod(options: LogMethodOptions = {}): MethodDecorator {
  const { name, level = "info" } = options;

  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    const original = descriptor.value as (...args: unknown[]) => unknown;
    const className = target.constructor?.name ?? "";
    const methodName = String(propertyKey);
    const label =
      name ?? (className ? `${className}.${methodName}` : methodName);

    descriptor.value = function (this: unknown, ...args: unknown[]): unknown {
      // Aspect chỉ lấy correlation từ RequestContext, KHÔNG đọc args.
      // Logging không bao giờ throw ra business flow.
      let baseMeta: Record<string, unknown> = {};
      try {
        const requestId = RequestContext.getRequestId();
        const userId = RequestContext.getUserId();
        baseMeta = {
          ...(requestId ? { requestId } : {}),
          ...(userId ? { userId } : {})
        };
      } catch {
        baseMeta = {};
      }

      const start = Date.now();

      const logLifecycle = (
        message: string,
        extra?: Record<string, unknown>
      ): void => {
        try {
          Logger[level](message, extra ? { ...baseMeta, ...extra } : baseMeta);
        } catch {
          /* logging must never break the business flow */
        }
      };
      const logCompleted = (): void =>
        logLifecycle(`${label} completed`, { durationMs: Date.now() - start });
      const logFailed = (error: unknown): void => {
        try {
          Logger.error(`${label} failed`, error, {
            ...baseMeta,
            durationMs: Date.now() - start
          });
        } catch {
          /* logging must never break the business flow */
        }
      };

      logLifecycle(`${label} initiated`);

      let result: unknown;
      try {
        result = original.apply(this, args);
      } catch (error) {
        logFailed(error);
        throw error;
      }

      if (result instanceof Promise) {
        return result.then(
          (value) => {
            logCompleted();
            return value;
          },
          (error) => {
            logFailed(error);
            throw error;
          }
        );
      }

      logCompleted();
      return result;
    };

    return descriptor;
  };
}
