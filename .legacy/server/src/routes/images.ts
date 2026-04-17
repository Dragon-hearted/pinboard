import { Hono } from "hono";
import { join } from "path";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import { insertImage, getImage, getAllImages, deleteImage } from "../db";
import type { ImageRecord } from "../types";

const UPLOADS_DIR = join(import.meta.dir, "../../uploads");

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const images = new Hono();

// POST /images/upload - Upload an image
images.post("/upload", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    const id = crypto.randomUUID();
    const ext = file.name.split(".").pop() || "png";
    const filename = `${id}.${ext}`;
    const filePath = join(UPLOADS_DIR, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await Bun.write(filePath, buffer);

    const record: ImageRecord = {
      id,
      filename,
      originalName: file.name,
      path: filePath,
      mimeType: file.type || "image/png",
      size: buffer.length,
      createdAt: new Date().toISOString(),
    };

    insertImage(record);
    return c.json(record, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Upload failed: ${message}` }, 500);
  }
});

// GET /images - List all images
images.get("/", (c) => {
  try {
    const allImages = getAllImages();
    return c.json(allImages);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});

// GET /images/:id - Get image metadata
images.get("/:id", (c) => {
  try {
    const id = c.req.param("id");
    // Avoid matching the "file" sub-route
    if (id === "upload") return c.notFound();

    const image = getImage(id);
    if (!image) {
      return c.json({ error: "Image not found" }, 404);
    }
    return c.json(image);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});

// GET /images/:id/file - Serve the actual image file
images.get("/:id/file", async (c) => {
  try {
    const id = c.req.param("id");
    const image = getImage(id);
    if (!image) {
      return c.json({ error: "Image not found" }, 404);
    }

    const file = Bun.file(image.path);
    if (!(await file.exists())) {
      return c.json({ error: "File not found on disk" }, 404);
    }

    const buffer = await file.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(image.size),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE /images/:id - Delete an image
images.delete("/:id", (c) => {
  try {
    const id = c.req.param("id");
    const image = getImage(id);
    if (!image) {
      return c.json({ error: "Image not found" }, 404);
    }

    // Remove file from disk
    try {
      unlinkSync(image.path);
    } catch {
      // File may already be gone, that's ok
    }

    deleteImage(id);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});

export { images };
