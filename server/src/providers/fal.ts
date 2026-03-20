import * as fal from "@fal-ai/serverless-client";
import type { ImageProvider, ModelInfo, GenerationRequest } from "../types";

// Configure fal with API key from environment
fal.config({
  credentials: process.env.FAL_KEY || "",
});

// Map internal model IDs to fal.ai endpoint strings
const MODEL_ENDPOINT_MAP: Record<string, string> = {
  "nanobanana-pro": "fal-ai/nanobanana-pro",
  "stable-diffusion-xl": "fal-ai/fast-sdxl",
  "flux-pro": "fal-ai/flux-pro",
};

export class FalProvider implements ImageProvider {
  name = "fal";

  models: ModelInfo[] = [
    {
      id: "nanobanana-pro",
      name: "NanoBanana Pro",
      description:
        "Fast, high-quality image generation with reference support",
      available: true,
    },
    {
      id: "stable-diffusion-xl",
      name: "Stable Diffusion XL",
      description: "Versatile image generation model",
      available: true,
    },
    {
      id: "flux-pro",
      name: "FLUX Pro",
      description: "Advanced image generation with fine detail",
      available: true,
    },
  ];

  async generate(
    request: GenerationRequest,
    referenceImageBuffers: { buffer: Buffer; mimeType: string }[]
  ): Promise<{ imageBuffer: Buffer; mimeType: string }> {
    const endpoint = MODEL_ENDPOINT_MAP[request.model];
    if (!endpoint) {
      throw new Error(`Unknown model: ${request.model}`);
    }

    // Convert reference image buffers to base64 data URLs
    const referenceImages = referenceImageBuffers.map(({ buffer, mimeType }) => {
      const base64 = buffer.toString("base64");
      return `data:${mimeType};base64,${base64}`;
    });

    try {
      const input: Record<string, unknown> = {
        prompt: request.prompt,
        ...(request.options || {}),
      };

      if (referenceImages.length > 0) {
        input.image_url = referenceImages[0];
        if (referenceImages.length > 1) {
          input.reference_images = referenceImages;
        }
      }

      const result = (await fal.subscribe(endpoint, {
        input,
      })) as { images?: { url: string; content_type?: string }[] };

      if (!result.images || result.images.length === 0) {
        throw new Error("No images returned from fal.ai");
      }

      const imageResult = result.images[0];
      const imageUrl = imageResult.url;

      // Fetch the generated image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch generated image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      const mimeType = imageResult.content_type || response.headers.get("content-type") || "image/png";

      return { imageBuffer, mimeType };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Fal generation failed: ${message}`);
    }
  }
}
