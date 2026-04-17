import { Hono } from "hono";
import { cors } from "hono/cors";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { images } from "./routes/images";
import { generate } from "./routes/generate";
import { models } from "./routes/models";

// Ensure uploads directory exists
const UPLOADS_DIR = join(import.meta.dir, "../uploads");
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = new Hono();

// CORS middleware
app.use(
  "*",
  cors({
    origin: ["http://localhost:5174", "http://localhost:5173"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check
app.get("/health", (c) => c.text("Pinboard API"));

// Mount routes
app.route("/api/images", images);
app.route("/api", generate);
app.route("/api/models", models);

const port = Number(process.env.PORT) || 3001;
console.log(`Pinboard server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
