import { useState, useCallback } from 'react'
import type { ImageRecord } from '../types'
import { uploadImage, deleteImage } from '../api/client'

export function useReferenceImages() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [uploading, setUploading] = useState(false)

  const uploadFiles = useCallback(async (files: File[]) => {
    setUploading(true)
    try {
      const results = await Promise.all(files.map((file) => uploadImage(file)))
      setImages((prev) => [...prev, ...results])
    } finally {
      setUploading(false)
    }
  }, [])

  const removeImage = useCallback(async (id: string) => {
    await deleteImage(id)
    setImages((prev) => prev.filter((img) => img.id !== id))
  }, [])

  const addImageRecord = useCallback((record: ImageRecord) => {
    setImages((prev) => [...prev, record])
  }, [])

  return { images, uploading, uploadFiles, removeImage, addImageRecord }
}
