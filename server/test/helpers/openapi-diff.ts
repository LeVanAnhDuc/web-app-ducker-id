// types
import type { OpenAPIV3 } from "openapi-types";

type Operation = OpenAPIV3.OperationObject;
type Parameter = OpenAPIV3.ParameterObject;
type Schema = OpenAPIV3.SchemaObject;

const VERBS = ["get", "post", "put", "patch", "delete"] as const;

/** Every `$ref` replaced by what it points at in `doc`. */
export const resolveRefs = <T>(node: T, doc: OpenAPIV3.Document): T => {
  const walk = (value: unknown, seen: string[]): unknown => {
    if (Array.isArray(value)) return value.map((item) => walk(item, seen));
    if (!value || typeof value !== "object") return value;
    const ref = (value as { $ref?: unknown }).$ref;
    if (typeof ref === "string") {
      if (seen.includes(ref)) return { $ref: ref };
      const target = ref
        .slice(2)
        .split("/")
        .reduce<unknown>(
          (n, part) => (n as Record<string, unknown> | undefined)?.[part],
          doc
        );
      return walk(target, [...seen, ref]);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, walk(v, seen)])
    );
  };
  return walk(node, []) as T;
};

const operations = (paths: OpenAPIV3.PathsObject): Map<string, Operation> =>
  new Map(
    Object.entries(paths).flatMap(([path, item]) =>
      VERBS.filter((verb) => item?.[verb]).map(
        (verb) =>
          [`${verb.toUpperCase()} ${path}`, item![verb] as Operation] as const
      )
    )
  );

const parameterKeys = (op: Operation): Map<string, string> =>
  new Map(
    ((op.parameters ?? []) as Parameter[]).map((param) => [
      `${param.in} ${param.name}`,
      `required=${Boolean(param.required)}`
    ])
  );

const bodySchema = (op: Operation): Schema | undefined => {
  const body = op.requestBody as OpenAPIV3.RequestBodyObject | undefined;
  return body?.content?.["application/json"]?.schema as Schema | undefined;
};

const statuses = (op: Operation): string[] => Object.keys(op.responses).sort();

const onlyIn = (
  label: string,
  a: Iterable<string>,
  b: Iterable<string>
): string[] => {
  const left = new Set(a);
  const right = new Set(b);
  return [
    ...[...left]
      .filter((x) => !right.has(x))
      .map((x) => `${label} ${x} only in hand-written`),
    ...[...right]
      .filter((x) => !left.has(x))
      .map((x) => `${label} ${x} only in generated`)
  ];
};

const compareOperation = (
  key: string,
  hand: Operation,
  generated: Operation
): string[] => {
  const diffs: string[] = [];

  const handParams = parameterKeys(hand);
  const genParams = parameterKeys(generated);
  diffs.push(
    ...onlyIn("parameter", handParams.keys(), genParams.keys()).map(
      (d) => `${key}: ${d}`
    )
  );
  for (const [name, required] of handParams) {
    const other = genParams.get(name);
    if (other !== undefined && other !== required) {
      diffs.push(
        `${key}: parameter ${name} is ${required} in hand-written, ${other} in generated`
      );
    }
  }

  const handBody = bodySchema(hand);
  const genBody = bodySchema(generated);
  if (Boolean(handBody) !== Boolean(genBody)) {
    diffs.push(
      `${key}: request body only in ${handBody ? "hand-written" : "generated"}`
    );
  } else if (handBody && genBody) {
    diffs.push(
      ...onlyIn(
        "request property",
        Object.keys(handBody.properties ?? {}),
        Object.keys(genBody.properties ?? {})
      ).map((d) => `${key}: ${d}`)
    );
    const handRequired = [...(handBody.required ?? [])].sort().join(",");
    const genRequired = [...(genBody.required ?? [])].sort().join(",");
    if (handRequired !== genRequired) {
      diffs.push(
        `${key}: required request properties [${handRequired}] in hand-written, [${genRequired}] in generated`
      );
    }
  }

  diffs.push(
    ...onlyIn("response status", statuses(hand), statuses(generated)).map(
      (d) => `${key}: ${d}`
    )
  );

  const handSecurity = JSON.stringify(hand.security);
  const genSecurity = JSON.stringify(generated.security);
  if (handSecurity !== genSecurity) {
    diffs.push(
      `${key}: security ${handSecurity} in hand-written, ${genSecurity} in generated`
    );
  }
  return diffs;
};

/**
 * What differs between two sets of operations, one sentence each: which
 * method and path exist, parameter names with `in` and `required`, request
 * body property names and the required set, the response status set, and
 * `security`. Both sides must have their `$ref`s resolved (`resolveRefs`).
 */
export const diffOperations = (
  handWritten: OpenAPIV3.PathsObject,
  generated: OpenAPIV3.PathsObject
): string[] => {
  const hand = operations(handWritten);
  const gen = operations(generated);
  const diffs: string[] = [];
  for (const [key, op] of hand) {
    const other = gen.get(key);
    if (!other) diffs.push(`${key}: only in hand-written`);
    else diffs.push(...compareOperation(key, op, other));
  }
  for (const key of gen.keys()) {
    if (!hand.has(key)) diffs.push(`${key}: only in generated`);
  }
  return diffs;
};
