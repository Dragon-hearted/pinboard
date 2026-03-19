import type { ReactNode } from 'react'
import GenerationHistory from './GenerationHistory'
import ModelSelector from './ModelSelector'
import type { GenerationResult, ModelInfo } from '../types'

interface LayoutProps {
  children: ReactNode
  generations: GenerationResult[]
  onSelectGeneration: (generation: GenerationResult) => void
  selectedGenerationId?: string
  models: ModelInfo[]
  selectedModel: string
  onModelChange: (modelId: string) => void
}

export default function Layout({
  children,
  generations,
  onSelectGeneration,
  selectedGenerationId,
  models,
  selectedModel,
  onModelChange,
}: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-80 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-zinc-100 tracking-tight">
              Pinboard
            </span>
          </div>
        </div>

        {/* Generation History */}
        <GenerationHistory
          generations={generations}
          onSelect={onSelectGeneration}
          selectedId={selectedGenerationId}
        />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 flex-shrink-0 bg-zinc-900/50 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-6">
          <div className="text-sm text-zinc-400">Creative Studio</div>
          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onChange={onModelChange}
          />
        </header>

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
