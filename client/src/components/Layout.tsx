import type { ReactNode } from 'react'
import GenerationHistory from './GenerationHistory'
import ModelSelector from './ModelSelector'
import type { GenerationResult, ModelInfo } from '../types'

interface LayoutProps {
  children: ReactNode
  sidebar: ReactNode
  generations: GenerationResult[]
  onSelectGeneration: (generation: GenerationResult) => void
  selectedGenerationId?: string
  models: ModelInfo[]
  selectedModel: string
  onModelChange: (modelId: string) => void
}

export default function Layout({
  children,
  sidebar,
  generations,
  onSelectGeneration,
  selectedGenerationId,
  models,
  selectedModel,
  onModelChange,
}: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
      {/* Left Panel - References + Prompt */}
      <aside
        className="w-[360px] flex-shrink-0 flex flex-col z-10"
        style={{
          background: 'var(--bg-panel)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header with logo + model selector */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            {/* Logo mark - layered squares */}
            <div className="relative w-8 h-8">
              <div
                className="absolute inset-0 rounded-md rotate-6"
                style={{ background: 'var(--accent)', opacity: 0.3 }}
              />
              <div
                className="absolute inset-0 rounded-md flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            </div>
            <div>
              <span
                className="text-base font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Pinboard
              </span>
              <span
                className="text-[10px] font-mono block -mt-0.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                studio
              </span>
            </div>
          </div>
          <ModelSelector models={models} selectedModel={selectedModel} onChange={onModelChange} />
        </div>

        {/* Sidebar content */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {sidebar}
        </div>
      </aside>

      {/* Center Canvas */}
      <main
        className="flex-1 flex flex-col min-w-0 relative z-0"
        style={{
          background: `radial-gradient(ellipse at center, rgba(44, 39, 35, 0.5) 0%, var(--bg-deep) 70%)`,
        }}
      >
        {children}
      </main>

      {/* Right Panel - History */}
      <aside
        className="w-[280px] flex-shrink-0 flex flex-col z-10"
        style={{
          background: 'var(--bg-panel)',
          borderLeft: '1px solid var(--border-subtle)',
        }}
      >
        <GenerationHistory
          generations={generations}
          onSelect={onSelectGeneration}
          selectedId={selectedGenerationId}
        />
      </aside>
    </div>
  )
}
