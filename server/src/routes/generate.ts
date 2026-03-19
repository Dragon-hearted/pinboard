import { Hono } from "hono";
import { join } from "path";
import { existsSync, mkdirSync, copyFileSync } from "fs";
import {
  insertGeneration,
  getGeneration,
  getAllGenerations,
  getImage,
  insertImage,
} from "../db";
import { registry } from "../providers/registry";
import type {
  GenerationRequest,
  GenerationResult,
  GenerationRecord,
  ImageRecord,
} from "../types";

const UPLOADS_DIR = join(import.meta.dir, "../../uploads");

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const generate = new Hono();

function toGenerationResult(record: GenerationRecord): GenerationResult {
  let referenceImageIds: string[];
  try {
    const parsed = JSON.parse(record.referenceImageIds);
    if (Array.isArray(parsed)) {
      // Old format: plain string array
      referenceImageIds = parsed;
    } else if (parsed && typeof parsed === "object") {
      // New format: { generation: string[], promptOnly: string[] }
      referenceImageIds = [
        ...(parsed.generation || []),
        ...(parsed.promptOnly || []),
      ];
    } else {
      referenceImageIds = [];
    }
  } catch {
    referenceImageIds = [];
  }

  return {
    id: record.id,
    imageUrl: `/api/images/${record.id}/file`,
    model: record.model,
    prompt: record.prompt,
    referenceImageIds,
    createdAt: record.createdAt,
  };
}

// POST / - Generate an image
generate.post("/generate", async (c) => {
  try {
    const body = await c.req.json<GenerationRequest>();

    if (!body.prompt) {
      return c.json({ error: "prompt is required" }, 400);
    }
    if (!body.model) {
      return c.json({ error: "model is required" }, 400);
    }

    // Resolve reference images - support both new and old request shapes
    const generationRefIds = body.generationRefIds || body.referenceImageIds || [];
    const promptOnlyRefIds = body.promptOnlyRefIds || [];

    const referenceImageBuffers: { buffer: Buffer; mimeType: string }[] = [];

    // Only load generation ref images as buffers (not prompt-only ones)
    for (const refId of generationRefIds) {
      const image = getImage(refId);
      if (!image) {
        return c.json(
          { error: `Reference image not found: ${refId}` },
          404
        );
      }
      const file = Bun.file(image.path);
      if (!(await file.exists())) {
        return c.json(
          { error: `Reference image file missing on disk: ${refId}` },
          404
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      referenceImageBuffers.push({
        buffer: Buffer.from(arrayBuffer),
        mimeType: image.mimeType,
      });
    }

    // Get provider and generate
    const provider = registry.getProvider(body.model);
    if (!provider) {
      return c.json({ error: `Unknown model: ${body.model}` }, 400);
    }

    const result = await provider.generate(body, referenceImageBuffers);

    // Save the generated image
    const id = crypto.randomUUID();
    const ext = result.mimeType.split("/")[1] || "png";
    const filename = `${id}.${ext}`;
    const filePath = join(UPLOADS_DIR, filename);

    await Bun.write(filePath, result.imageBuffer);

    // Insert generation record
    const generationRecord: GenerationRecord = {
      id,
      prompt: body.prompt,
      model: body.model,
      resultPath: filePath,
      referenceImageIds: JSON.stringify({
        generation: generationRefIds,
        promptOnly: promptOnlyRefIds,
      }),
      createdAt: new Date().toISOString(),
    };

    insertGeneration(generationRecord);

    // Also insert as an image record so it can be served via /api/images/:id/file
    const imageRecord: ImageRecord = {
      id,
      filename,
      originalName: `generated-${id}.${ext}`,
      path: filePath,
      mimeType: result.mimeType,
      size: result.imageBuffer.length,
      createdAt: generationRecord.createdAt,
    };
    insertImage(imageRecord);

    return c.json(toGenerationResult(generationRecord), 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Generation failed: ${message}` }, 500);
  }
});

// GET /generations - List all generations
generate.get("/generations", (c) => {
  try {
    const generations = getAllGenerations();
    return c.json(generations.map(toGenerationResult));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});

// GET /generations/:id - Get single generation
generate.get("/generations/:id", (c) => {
  try {
    const id = c.req.param("id");
    const generation = getGeneration(id);
    if (!generation) {
      return c.json({ error: "Generation not found" }, 404);
    }
    return c.json(toGenerationResult(generation));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});

// POST /generations/:id/use-as-reference - Copy generation result to images
generate.post("/generations/:id/use-as-reference", async (c) => {
  try {
    const id = c.req.param("id");
    const generation = getGeneration(id);
    if (!generation) {
      return c.json({ error: "Generation not found" }, 404);
    }

    const sourceFile = Bun.file(generation.resultPath);
    if (!(await sourceFile.exists())) {
      return c.json({ error: "Generation result file not found on disk" }, 404);
    }

    // Create a new image record from the generation
    const newId = crypto.randomUUID();
    const ext = generation.resultPath.split(".").pop() || "png";
    const filename = `${newId}.${ext}`;
    const newPath = join(UPLOADS_DIR, filename);

    // Copy the file
    copyFileSync(generation.resultPath, newPath);

    const stat = await Bun.file(newPath).size;
    const mimeType = `image/${ext}`;

    const imageRecord: ImageRecord = {
      id: newId,
      filename,
      originalName: `generation-${id}.${ext}`,
      path: newPath,
      mimeType,
      size: stat,
      createdAt: new Date().toISOString(),
    };

    insertImage(imageRecord);
    return c.json(imageRecord, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});

export { generate };
