import type { ImageProvider, ModelInfo } from "../types";
import { GoogleAIProvider } from "./google";

export class ProviderRegistry {
  private providers: ImageProvider[] = [];

  register(provider: ImageProvider): void {
    this.providers.push(provider);
  }

  getProvider(modelId: string): ImageProvider | undefined {
    return this.providers.find((provider) =>
      provider.models.some((model) => model.id === modelId)
    );
  }

  getModels(): ModelInfo[] {
    return this.providers.flatMap((provider) => provider.models);
  }

  getDefaultModel(): string {
    return "nanobanana";
  }
}

// "Coming soon" models — not yet available for generation
const comingSoonModels: ModelInfo[] = [
  {
    id: "pixelforge",
    name: "PixelForge",
    description: "High-fidelity photorealistic generation",
    available: false,
  },
  {
    id: "dreamweaver",
    name: "DreamWeaver",
    description: "Artistic and stylized image creation",
    available: false,
  },
  {
    id: "aura-vision",
    name: "AuraVision",
    description: "Abstract and conceptual art generation",
    available: false,
  },
  {
    id: "chromashift",
    name: "ChromaShift",
    description: "Color-focused style transfer and generation",
    available: false,
  },
];

// Singleton registry with GoogleAIProvider registered
const registry = new ProviderRegistry();
registry.register(new GoogleAIProvider());

// Register coming-soon models as a static provider (no generate capability)
registry.register({
  name: "coming-soon",
  models: comingSoonModels,
  async generate(): Promise<never> {
    throw new Error("This model is not yet available");
  },
});

export { registry };
