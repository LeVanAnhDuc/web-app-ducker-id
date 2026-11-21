// libs
import { Expose, plainToInstance, Transform } from "class-transformer";
// types
import type { ClassConstructor } from "class-transformer";

export { Expose };

type Source = Record<string, unknown>;

interface MongooseLike {
  toObject: () => object;
}

const isMongooseDocument = (value: unknown): value is MongooseLike =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Partial<MongooseLike>).toObject === "function";

// Each output decorator is `@Expose()` plus one conversion that runs only when
// building the DTO (toClassOnly), so it never runs a second time on the way out.
const exposeWith =
  (convert: (src: Source, key: string) => unknown): PropertyDecorator =>
  (target, propertyKey) => {
    Expose()(target, propertyKey);
    Transform(({ obj, key }) => convert(obj as Source, key), {
      toClassOnly: true
    })(target, propertyKey);
  };

const idToString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

/**
 * An ObjectId as its hex string, `null` when absent. A bare `@Expose()` must
 * never carry an ObjectId: class-transformer walks it as an object and returns
 * its internals. `from` reads another key, e.g. `@ExposeId("_id") id`.
 */
export const ExposeId = (from?: string): PropertyDecorator =>
  exposeWith((src, key) => idToString(src[from ?? key]));

/** An array of ObjectIds as hex strings; an absent array becomes `[]`. */
export const ExposeIds = (from?: string): PropertyDecorator =>
  exposeWith((src, key) =>
    ((src[from ?? key] as unknown[] | undefined) ?? []).map(String)
  );

/** A Date as an ISO 8601 string, `null` when absent. */
export const ExposeDate = (from?: string): PropertyDecorator =>
  exposeWith((src, key) => {
    const value = src[from ?? key];
    return value instanceof Date ? value.toISOString() : null;
  });

/** The value as stored, `null` instead of `undefined`. */
export const ExposeOrNull = (from?: string): PropertyDecorator =>
  exposeWith((src, key) => src[from ?? key] ?? null);

/**
 * A value computed from the whole source record — a default, a lookup, a
 * masked value or a nested DTO (`(src) => toDto(PublicCategoryDto, src.x)`).
 */
export const ExposeFrom = <S extends object = Source>(
  compute: (src: S) => unknown
): PropertyDecorator => exposeWith((src) => compute(src as unknown as S));

/**
 * Builds a response DTO from a Mongoose document or a lean record: only the
 * properties the class exposes are copied, each through its decorator. The
 * result is a plain object, so it serialises and compares like the literal
 * the old `to…Dto` mappers returned.
 */
// An array maps to an array. `any` (an untyped fixture or `JSON.parse`) counts
// as one record — with overloads it would match the array signature first.
// Tuples keep the check from distributing over `any`; the inner test is true
// only for `any`, which every array type is assignable to.
type DtoOf<S, T> = [S] extends [readonly unknown[]]
  ? [readonly unknown[]] extends [S]
    ? T
    : T[]
  : T;

const mapOne = <T extends object>(
  Dto: ClassConstructor<T>,
  source: object
): T => {
  const plain = isMongooseDocument(source) ? source.toObject() : source;
  const instance = plainToInstance(Dto, plain, {
    excludeExtraneousValues: true
  });
  return { ...instance };
};

export const toDto = <T extends object, S extends object>(
  Dto: ClassConstructor<T>,
  source: S
): DtoOf<S, T> =>
  (Array.isArray(source)
    ? source.map((item: object) => mapOne(Dto, item))
    : mapOne(Dto, source)) as DtoOf<S, T>;
