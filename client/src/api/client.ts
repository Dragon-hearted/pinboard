import type { ImageRecord, GenerationRequest, GenerationResult, ModelInfo } from '../types'

const BASE_URL = '/api'

export async function uploadImage(file: File): Promise<ImageRecord> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/images/upload`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
  return res.json()
}

export async function getImages(): Promise<ImageRecord[]> {
  const res = await fetch(`${BASE_URL}/images`)
  if (!res.ok) throw new Error(`Failed to fetch images: ${res.statusText}`)
  return res.json()
}

export async function deleteImage(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/images/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed: ${res.statusText}`)
}

export function getImageUrl(id: string): string {
  return `${BASE_URL}/images/${id}/file`
}

export async function generate(request: GenerationRequest): Promise<GenerationResult> {
  const res = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) throw new Error(`Generation failed: ${res.statusText}`)
  return res.json()
}

export async function getGenerations(): Promise<GenerationResult[]> {
  const res = await fetch(`${BASE_URL}/generations`)
  if (!res.ok) throw new Error(`Failed to fetch generations: ${res.statusText}`)
  return res.json()
}

export async function useAsReference(generationId: string): Promise<ImageRecord> {
  const res = await fetch(`${BASE_URL}/generations/${generationId}/use-as-reference`, { method: 'POST' })
  if (!res.ok) throw new Error(`Use as reference failed: ${res.statusText}`)
  return res.json()
}

export async function getModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${BASE_URL}/models`)
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`)
  return res.json()
}
