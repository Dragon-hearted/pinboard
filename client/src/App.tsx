import { useState, useEffect, useCallback } from 'react'
import Layout from './components/Layout'
import ImageUploader from './components/ImageUploader'
import ReferenceGallery from './components/ReferenceGallery'
import PromptEditor from './components/PromptEditor'
import GeneratedImage from './components/GeneratedImage'
import ActionBar from './components/ActionBar'
import { useReferenceImages } from './hooks/useReferenceImages'
import { useImageGeneration } from './hooks/useImageGeneration'
import { getModels, useAsReference } from './api/client'
import type { ModelInfo } from './types'

export default function App() {
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('nanobanana-pro')
  const [models, setModels] = useState<ModelInfo[]>([])

  const ref = useReferenceImages()
  const gen = useImageGeneration()

  useEffect(() => {
    getModels()
      .then(setModels)
      .catch(() => {
        // Models will show as loading state
      })
  }, [])

  const handleGenerate = useCallback(() => {
    const imageIds = ref.images.map((img) => img.id)
    gen.generateImage(imageIds, prompt, selectedModel)
  }, [ref.images, gen, prompt, selectedModel])

  const handleUseAsReference = useCallback(async () => {
    if (!gen.currentResult) return
    try {
      const record = await useAsReference(gen.currentResult.id)
      ref.addImageRecord(record)
    } catch {
      // Silently handle error
    }
  }, [gen.currentResult, ref])

  const handleDownload = useCallback(() => {
    if (!gen.currentResult?.imageUrl) return
    const a = document.createElement('a')
    a.href = gen.currentResult.imageUrl
    a.download = `generation-${gen.currentResult.id}.png`
    a.click()
  }, [gen.currentResult])

  return (
    <Layout
      generations={gen.generations}
      onSelectGeneration={gen.selectGeneration}
      selectedGenerationId={gen.currentResult?.id}
      models={models}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <ImageUploader onUpload={ref.uploadFiles} uploading={ref.uploading} />
        <ReferenceGallery images={ref.images} onRemove={ref.removeImage} />
        <PromptEditor
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleGenerate}
          disabled={ref.uploading}
          loading={gen.loading}
        />
        {gen.error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-red-400">{gen.error}</p>
            <button
              onClick={gen.clearError}
              className="text-red-400 hover:text-red-300 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        )}
        <GeneratedImage
          imageUrl={gen.currentResult?.imageUrl}
          loading={gen.loading}
          prompt={gen.currentResult?.prompt}
        />
        <ActionBar
          onRegenerate={gen.regenerate}
          onUseAsReference={handleUseAsReference}
          onDownload={handleDownload}
          disabled={gen.loading}
          imageUrl={gen.currentResult?.imageUrl}
        />
      </div>
    </Layout>
  )
}
