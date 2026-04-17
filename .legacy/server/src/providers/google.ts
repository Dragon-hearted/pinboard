import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ImageProvider, ModelInfo, GenerationRequest } from "../types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_KEY || "");

export class GoogleAIProvider implements ImageProvider {
  name = "google";

  models: ModelInfo[] = [
    {
      id: "nanobanana",
      name: "NanoBanana",
      description: "Fast image generation with reference support",
      available: true,
    },
  ];

  async generate(
    request: GenerationRequest,
    referenceImageBuffers: { buffer: Buffer; mimeType: string }[]
  ): Promise<{ imageBuffer: Buffer; mimeType: string }> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      // Build parts array: text prompt + inline reference images
      const parts: any[] = [{ text: request.prompt }];

      for (const ref of referenceImageBuffers) {
        parts.push({
          inlineData: {
            mimeType: ref.mimeType,
            data: ref.buffer.toString("base64"),
          },
        });
      }

      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["image", "text"],
        } as any,
      });

      // Extract image from response
      const response = result.response;
      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if ((part as any).inlineData) {
            const inlineData = (part as any).inlineData;
            const imageBuffer = Buffer.from(inlineData.data, "base64");
            return {
              imageBuffer,
              mimeType: inlineData.mimeType || "image/png",
            };
          }
        }
      }

      throw new Error("No image returned from Google AI Studio");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Google AI Studio generation failed: ${message}`);
    }
  }
}
