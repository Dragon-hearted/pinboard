import { useState, useCallback } from 'react'
import type { ImageRecord, TaggedImage } from '../types'
import { uploadImage, deleteImage } from '../api/client'

export function useReferenceImages() {
  const [images, setImages] = useState<TaggedImage[]>([])
  const [uploading, setUploading] = useState(false)

  const uploadFiles = useCallback(async (files: File[]) => {
    setUploading(true)
    try {
      const results = await Promise.all(files.map((file) => uploadImage(file)))
      setImages((prev) => {
        const newImages: TaggedImage[] = results.map((record, i) => ({
          ...record,
          tag: prev.length + i + 1,
          referenceMode: 'generation' as const,
        }))
        return [...prev, ...newImages]
      })
    } finally {
      setUploading(false)
    }
  }, [])

  const removeImage = useCallback(async (id: string) => {
    await deleteImage(id)
    setImages((prev) =>
      prev
        .filter((img) => img.id !== id)
        .map((img, i) => ({ ...img, tag: i + 1 }))
    )
  }, [])

  const addImageRecord = useCallback((record: ImageRecord) => {
    setImages((prev) => [
      ...prev,
      {
        ...record,
        tag: prev.length + 1,
        referenceMode: 'generation' as const,
      },
    ])
  }, [])

  const toggleReferenceMode = useCallback((id: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id
          ? { ...img, referenceMode: img.referenceMode === 'generation' ? 'prompt-only' : 'generation' }
          : img
      )
    )
  }, [])

  return { images, uploading, uploadFiles, removeImage, addImageRecord, toggleReferenceMode }
}
