import { useState, useEffect, useCallback, useRef } from 'react'
import type { GenerationResult } from '../types'
import { generate, getGenerations } from '../api/client'

interface LastParams {
  generationRefIds: string[]
  promptOnlyRefIds: string[]
  prompt: string
  model: string
}

export function useImageGeneration() {
  const [currentResult, setCurrentResult] = useState<GenerationResult | null>(null)
  const [generations, setGenerations] = useState<GenerationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastParamsRef = useRef<LastParams | null>(null)

  useEffect(() => {
    getGenerations()
      .then((gens) => {
        setGenerations(gens)
        if (gens.length > 0) {
          setCurrentResult(gens[0])
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load generations'
        setError(message)
      })
  }, [])

  const generateImage = useCallback(
    async (generationRefIds: string[], promptOnlyRefIds: string[], prompt: string, model: string) => {
      setLoading(true)
      setError(null)
      lastParamsRef.current = { generationRefIds, promptOnlyRefIds, prompt, model }
      try {
        const result = await generate({ generationRefIds, promptOnlyRefIds, prompt, model })
        setCurrentResult(result)
        setGenerations((prev) => [result, ...prev])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Generation failed'
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const regenerate = useCallback(async () => {
    if (!lastParamsRef.current) return
    const { generationRefIds, promptOnlyRefIds, prompt, model } = lastParamsRef.current
    await generateImage(generationRefIds, promptOnlyRefIds, prompt, model)
  }, [generateImage])

  const selectGeneration = useCallback((gen: GenerationResult) => {
    setCurrentResult(gen)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    currentResult,
    generations,
    loading,
    error,
    generateImage,
    regenerate,
    selectGeneration,
    clearError,
  }
}
