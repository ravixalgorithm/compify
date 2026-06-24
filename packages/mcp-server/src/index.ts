import { Hono } from "hono";
import { createApp } from "./hono-app.js";

// Vercel's Hono builder detects the framework by finding a `hono` import in the
// entrypoint, so the import above must stay even though the app is built in
// hono-app.ts.
const app: Hono<{ Variables: { userId: string } }> = createApp();

/** Vercel serverless entry — Hono zero-config deploy. */
export default app;
