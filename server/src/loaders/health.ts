// libs
import { Router } from "express";
// types
import type { Request, Response } from "express";
import type { RedisClientType } from "redis";
// common
import { InternalServerError } from "@/exceptions";
import { STATUS_CODES } from "@/common/http";
import { sendSuccess } from "@/common/responses";
// database
import { isMongoHealthy } from "@/database/mongodb";
import { checkRedisHealth } from "@/database/redis";
// others
import { asyncHandler } from "@/utils/async-handler";

const checkMongoDB = asyncHandler(async (req: Request, res: Response) => {
  const isHealthy = isMongoHealthy();

  if (!isHealthy) {
    throw new InternalServerError({
      message: "MongoDB is down",
      code: "MONGODB_UNHEALTHY"
    });
  }

  sendSuccess(req, res, {
    status: STATUS_CODES.OK,
    message: "MongoDB is healthy",
    data: { mongodb: { status: "up" } }
  });
});

const checkRedis = (redis: RedisClientType) =>
  asyncHandler(async (req: Request, res: Response) => {
    const redisHealth = await checkRedisHealth(redis);

    if (!redisHealth.isHealthy) {
      throw new InternalServerError({
        message: "Redis is down",
        code: "REDIS_UNHEALTHY"
      });
    }

    sendSuccess(req, res, {
      status: STATUS_CODES.OK,
      message: "Redis is healthy",
      data: {
        redis: { status: "up", latency_ms: redisHealth.latency ?? null }
      }
    });
  });

const checkAll = (redis: RedisClientType) =>
  asyncHandler(async (req: Request, res: Response) => {
    const mongoHealthy = isMongoHealthy();
    const redisHealth = await checkRedisHealth(redis);
    const allHealthy = mongoHealthy && redisHealth.isHealthy;

    if (!allHealthy) {
      const down = [
        !mongoHealthy && "MongoDB",
        !redisHealth.isHealthy && "Redis"
      ].filter(Boolean);

      throw new InternalServerError({
        message: `Services down: ${down.join(", ")}`,
        code: "SERVICES_UNHEALTHY"
      });
    }

    sendSuccess(req, res, {
      status: STATUS_CODES.OK,
      message: "All services are healthy",
      data: {
        mongodb: { status: "up" },
        redis: { status: "up", latency_ms: redisHealth.latency ?? null }
      }
    });
  });

export const createHealthRouter = (redis: RedisClientType): Router => {
  const healthRouter = Router();

  healthRouter.get("/mongodb", checkMongoDB);
  healthRouter.get("/redis", checkRedis(redis));
  healthRouter.get("/all", checkAll(redis));

  return healthRouter;
};
