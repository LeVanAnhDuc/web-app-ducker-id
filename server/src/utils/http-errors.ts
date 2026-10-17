/**
 * Errors raised by express.json() / express.urlencoded() (body-parser) before
 * any route runs: a body that is not valid JSON (`entity.parse.failed`, 400),
 * one over the size limit (`entity.too.large`, 413), an unsupported charset or
 * encoding (415). They are http-errors objects — a 4xx `status`, a `type` and
 * `expose: true` — and the fault is the caller's, never the server's.
 */
export type BodyParserError = Error & {
  status: number;
  type: string;
  expose: true;
};

export function isBodyParserError(err: unknown): err is BodyParserError {
  if (!(err instanceof Error)) return false;
  const { status, type, expose } = err as Partial<BodyParserError>;
  return (
    expose === true &&
    typeof type === "string" &&
    typeof status === "number" &&
    status >= 400 &&
    status < 500
  );
}
