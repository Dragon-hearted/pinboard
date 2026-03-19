export interface GenerationRequest {
  prompt: string;
  model: string;
  generationRefIds: string[];   // Images sent as actual references to the model
  promptOnlyRefIds: string[];   // Images referenced in prompt but NOT sent to model
  // Keep backward compat
  referenceImageIds?: string[];
  options?: Record<string, unknown>;
}

export interface GenerationResult {
  id: string;
  imageUrl: string;
  model: string;
  prompt: string;
  referenceImageIds: string[];
  createdAt: string;
}

export interface ImageRecord {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface GenerationRecord {
  id: string;
  prompt: string;
  model: string;
  resultPath: string;
  referenceImageIds: string;
  createdAt: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

export interface ImageProvider {
  name: string;
  models: ModelInfo[];
  generate(
    request: GenerationRequest,
    referenceImageBuffers: { buffer: Buffer; mimeType: string }[]
  ): Promise<{ imageBuffer: Buffer; mimeType: string }>;
}
