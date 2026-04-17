export interface ImageRecord {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface TaggedImage extends ImageRecord {
  tag: number;  // 1-based sequential index
  referenceMode: 'generation' | 'prompt-only';
}

export interface GenerationRequest {
  generationRefIds: string[];
  promptOnlyRefIds: string[];
  prompt: string;
  model: string;
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

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  available: boolean;
}
