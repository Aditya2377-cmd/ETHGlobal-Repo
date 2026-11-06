import { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { INTERNAL_SECRET_HEADER } from "../constants";

/**
 * Validates service-to-service internal requests using the shared internal secret.
 */
export function requireInternalSecret(req: Request, res: Response, next: NextFunction): void {
  const secretHeader = req.header(INTERNAL_SECRET_HEADER);

  if (!secretHeader || secretHeader !== config.INTERNAL_SERVICE_SECRET) {
    res.status(401).json({
      error: "Unauthorized",
      message: `Missing or invalid internal secret header: ${INTERNAL_SECRET_HEADER}`,
    });
    return;
  }

  next();
}
