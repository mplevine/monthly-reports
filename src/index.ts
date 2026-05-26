/**
 * Express server entry point for the BI Monthly Report Copilot Extension.
 *
 * Registers a single POST /agent endpoint that GitHub Copilot Chat calls
 * whenever the user invokes the extension.  All incoming requests are
 * verified using the Copilot Extensions SDK before being handled.
 */

import {
  verifyAndParseRequest,
} from "@copilot-extensions/preview-sdk";
import express, { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { agentHandler } from "./agent.js";

const app = express();
const PORT = process.env.PORT ?? 3100;

// Capture the raw request body so the SDK can verify the webhook signature.
app.use(
  express.json({
    verify: (req: Request & { rawBody?: string }, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
);

/**
 * Rate limiter for the agent endpoint: at most 30 requests per minute per IP.
 * This limits abuse while comfortably accommodating normal Copilot usage.
 */
const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Too many requests from this IP. Please wait a moment before trying again.",
  },
});

/**
 * POST /agent — the single endpoint called by GitHub Copilot Chat.
 *
 * Verifies the request signature before delegating to the agent handler.
 */
app.post("/agent", agentLimiter, async (req: Request & { rawBody?: string }, res: Response, next: NextFunction) => {
  const signature = req.headers["github-public-key-signature"] as string;
  const keyId = req.headers["github-public-key-identifier"] as string;
  const rawBody = req.rawBody ?? JSON.stringify(req.body);

  if (!signature || !keyId) {
    res.status(400).json({
      error:
        "Missing github-public-key-signature or github-public-key-identifier headers.",
    });
    return;
  }

  try {
    const { isValidRequest } = await verifyAndParseRequest(
      rawBody,
      signature,
      keyId,
      { token: process.env.GITHUB_TOKEN },
    );

    if (!isValidRequest) {
      res.status(401).json({ error: "Request signature verification failed." });
      return;
    }
  } catch (err) {
    next(err);
    return;
  }

  await agentHandler(req, res);
});

/** Basic health-check endpoint. */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "bi-monthly-report-agent" });
});

app.listen(PORT, () => {
  console.log(`BI Monthly Report agent listening on port ${PORT}`);
});

export { app };
