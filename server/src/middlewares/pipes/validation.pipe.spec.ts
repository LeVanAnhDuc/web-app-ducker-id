// libs
import express from "express";
import Joi from "joi";
// types
import type { Server } from "http";
import type { AddressInfo } from "net";
import type { ErrorRequestHandler, Express } from "express";
// common
import { AppError } from "@/exceptions";
// others
import { bodyPipe, queryPipe } from "./validation.pipe";

// Runs the pipes inside a real Express app, because what they depend on —
// whether req.query can be replaced, what req.body is when no body was sent —
// is Express behaviour that a hand-built req object would only imitate.

const reportErrors: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ code: err.code });
    return;
  }
  res.status(500).json({ code: "UNEXPECTED", message: String(err) });
};

const listen = (app: Express): Promise<{ server: Server; url: string }> =>
  new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });

describe("validation pipes in a real Express app", () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    // Stand-in for the i18n middleware: the pipe translates Joi messages.
    app.use((req, _res, next) => {
      req.t = ((key: string) => key) as typeof req.t;
      next();
    });

    app.get(
      "/query",
      queryPipe(Joi.object({ page: Joi.number().integer().min(1) })),
      (req, res) => {
        res.json(req.query);
      }
    );

    app.post(
      "/body",
      bodyPipe(Joi.object({ email: Joi.string().email().required() })),
      (req, res) => {
        res.json({ email: req.body.email });
      }
    );

    app.use(reportErrors);
    ({ server, url } = await listen(app));
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("replaces req.query with the validated, converted and stripped value", async () => {
    const res = await fetch(`${url}/query?page=2&junk=1`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ page: 2 });
  });

  it("rejects an invalid query with a validation error", async () => {
    const res = await fetch(`${url}/query?page=0`);

    expect(res.status).toBe(400);
  });

  it("rejects a request that sends no body at all", async () => {
    const res = await fetch(`${url}/body`, { method: "POST" });

    expect(res.status).toBe(400);
  });

  it("passes a valid body through", async () => {
    const res = await fetch(`${url}/body`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.co", extra: true })
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: "a@b.co" });
  });
});
