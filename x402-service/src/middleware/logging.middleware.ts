import { NextFunction, Request, Response } from "express";

export function safeLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Redacted structured log - strictly avoids keys, signatures, prompts, and tokens
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method,
        path: originalUrl.split("?")[0],
        status,
        durationMs: duration,
      })
    );
  });

  next();
}
