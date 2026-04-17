import { useState, useEffect, useCallback } from 'react'
import Layout from './components/Layout'
import ImageUploader from './components/ImageUploader'
import ReferenceGallery from './components/ReferenceGallery'
import PromptEditor from './components/PromptEditor'
import GeneratedImage from './components/GeneratedImage'
import { useReferenceImages } from './hooks/useReferenceImages'
import { useImageGeneration } from './hooks/useImageGeneration'
import { getModels, useAsReference } from './api/client'
import type { ModelInfo } from './types'

export default function App() {
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('nanobanana')
  const [models, setModels] = useState<ModelInfo[]>([])

  const ref = useReferenceImages()
  const gen = useImageGeneration()

  useEffect(() => {
    getModels().then(setModels).catch(() => {})
  }, [])

  const handleGenerate = useCallback(() => {
    const generationRefIds = ref.images
      .filter(img => img.referenceMode === 'generation')
      .map(img => img.id)
    const promptOnlyRefIds = ref.images
      .filter(img => img.referenceMode === 'prompt-only')
      .map(img => img.id)
    gen.generateImage(generationRefIds, promptOnlyRefIds, prompt, selectedModel)
  }, [ref.images, gen, prompt, selectedModel])

  const handleUseAsReference = useCallback(async () => {
    if (!gen.currentResult) return
    try {
      const record = await useAsReference(gen.currentResult.id)
      ref.addImageRecord(record)
    } catch {}
  }, [gen.currentResult, ref])

  const handleDownload = useCallback(() => {
    if (!gen.currentResult?.imageUrl) return
    const a = document.createElement('a')
    a.href = gen.currentResult.imageUrl
    a.download = `pinboard-${gen.currentResult.id}.png`
    a.click()
  }, [gen.currentResult])

  // Sidebar content (left panel)
  const sidebar = (
    <div className="space-y-4">
      <ImageUploader onUpload={ref.uploadFiles} uploading={ref.uploading} hasImages={ref.images.length > 0} />
      <ReferenceGallery
        images={ref.images}
        onRemove={ref.removeImage}
        onToggleMode={ref.toggleReferenceMode}
      />
      <PromptEditor
        value={prompt}
        onChange={setPrompt}
        onSubmit={handleGenerate}
        disabled={ref.uploading}
        loading={gen.loading}
        images={ref.images}
      />
      {gen.error && (
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg"
          style={{
            background: 'var(--danger-muted)',
            border: '1px solid rgba(199, 80, 80, 0.2)',
          }}
        >
          <p className="text-xs" style={{ color: 'var(--danger)' }}>{gen.error}</p>
          <button
            onClick={gen.clearError}
            className="text-xs font-medium shrink-0 transition-colors"
            style={{ color: 'rgba(199, 80, 80, 0.6)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(199, 80, 80, 0.6)' }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )

  return (
    <Layout
      sidebar={sidebar}
      generations={gen.generations}
      onSelectGeneration={gen.selectGeneration}
      selectedGenerationId={gen.currentResult?.id}
      models={models}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
    >
      <GeneratedImage
        imageUrl={gen.currentResult?.imageUrl}
        loading={gen.loading}
        prompt={gen.currentResult?.prompt}
        onRegenerate={gen.regenerate}
        onUseAsReference={handleUseAsReference}
        onDownload={handleDownload}
        disabled={gen.loading}
      />
    </Layout>
  )
}
