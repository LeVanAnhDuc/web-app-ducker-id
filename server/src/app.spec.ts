// types
import type { Server } from "http";
import type { AddressInfo } from "net";
// others
import app from "./app";

describe("app query parsing", () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    app.get("/__query-probe", (req, res) => {
      res.json(req.query);
    });
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("parses bracket syntax into objects, as Express 4 did", async () => {
    // Express 5 defaults to the "simple" parser, which keeps `status[$ne]` as a
    // flat key; the Joi schemas would strip it silently instead of refusing the
    // query operator with 400 (REQ-ADMINLOGINHISTORY / REQ-LOGINHISTORY).
    const res = await fetch(`${url}/__query-probe?status[$ne]=success&q=a,b`);

    expect(await res.json()).toEqual({
      status: { $ne: "success" },
      q: "a,b"
    });
  });
});
