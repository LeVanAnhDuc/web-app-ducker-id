// types
import type { CategoryServiceDeps } from "../deps";

export const CATEGORY_ID = "64b2f0c2f1a2b3c4d5e6f7a1";
export const OTHER_ID = "64b2f0c2f1a2b3c4d5e6f7a2";
export const THIRD_ID = "64b2f0c2f1a2b3c4d5e6f7a3";

export const categoryDoc = (
  id: string,
  en: string,
  slug: string,
  sortOrder = 0
) => ({
  _id: { toString: () => id },
  slug,
  name: { en, vi: `${en} (vi)` },
  sortOrder,
  createdAt: new Date("2026-10-04T00:00:00.000Z"),
  updatedAt: new Date("2026-10-04T00:00:00.000Z")
});

/**
 * Bare jest.fn()s — `resetMocks: true` clears implementations between tests,
 * so each test (or its beforeEach) sets the behaviour it needs.
 */
export const makeDeps = () => {
  const categoryRepo = {
    findAll: jest.fn(),
    findAllWithAppCount: jest.fn(),
    findById: jest.fn(),
    existsByNameEn: jest.fn(),
    findSlugFamily: jest.fn(),
    findMaxSortOrder: jest.fn(),
    countByIds: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    setSortOrders: jest.fn(),
    deleteById: jest.fn()
  };
  const webAppRepo = {
    countByCategory: jest.fn(),
    findOrphansOf: jest.fn(),
    reassignOrphans: jest.fn(),
    pullCategory: jest.fn()
  };
  const deps = { categoryRepo, webAppRepo } as unknown as CategoryServiceDeps;
  return { deps, categoryRepo, webAppRepo };
};

export const duplicateKeyError = (field: string) =>
  Object.assign(new Error("E11000 duplicate key"), {
    code: 11000,
    keyPattern: { [field]: 1 }
  });
