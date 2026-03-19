import type { ImageProvider, ModelInfo } from "../types";
import { FalProvider } from "./fal";

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
    return "nanobanana-pro";
  }
}

// Singleton registry with FalProvider registered
const registry = new ProviderRegistry();
registry.register(new FalProvider());

export { registry };
