import { Hono } from "hono";
import { registry } from "../providers/registry";

const models = new Hono();

// GET / - List available models
models.get("/", (c) => {
  try {
    const allModels = registry.getModels();
    const defaultModel = registry.getDefaultModel();
    return c.json({
      models: allModels,
      defaultModel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});

export { models };
