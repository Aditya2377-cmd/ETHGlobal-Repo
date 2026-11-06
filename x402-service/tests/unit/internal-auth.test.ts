import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { requireInternalSecret } from "../../src/middleware/auth.middleware";
import { config } from "../../src/config";
import { INTERNAL_SECRET_HEADER } from "../../src/constants";

describe("Internal Service Authentication Middleware", () => {
  const app = express();
  app.use(express.json());
  app.get("/test-internal", requireInternalSecret, (_req, res) => {
    res.json({ authorized: true });
  });

  it("should reject request without internal secret header", async () => {
    const res = await request(app).get("/test-internal");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("should reject request with incorrect internal secret", async () => {
    const res = await request(app)
      .get("/test-internal")
      .set(INTERNAL_SECRET_HEADER, "wrong-secret");
    expect(res.status).toBe(401);
  });

  it("should permit request with valid internal secret", async () => {
    const res = await request(app)
      .get("/test-internal")
      .set(INTERNAL_SECRET_HEADER, config.INTERNAL_SERVICE_SECRET);
    expect(res.status).toBe(200);
    expect(res.body.authorized).toBe(true);
  });
});
