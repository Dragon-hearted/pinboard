import { useState, useRef, useEffect } from 'react'
import type { ModelInfo } from '../types'

interface ModelSelectorProps {
  models: ModelInfo[]
  selectedModel: string
  onChange: (modelId: string) => void
}

// All known models with availability status
const ALL_MODELS = [
  { id: 'nanobanana', name: 'NanoBanana', available: true },
  { id: 'pixelforge', name: 'PixelForge', available: false },
  { id: 'dreamweaver', name: 'DreamWeaver', available: false },
  { id: 'auravision', name: 'AuraVision', available: false },
  { id: 'chromashift', name: 'ChromaShift', available: false },
]

export default function ModelSelector({ models, selectedModel, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  if (models.length === 0) {
    return (
      <div className="font-mono text-[11px]" style={{ color: 'var(--text-ghost)' }}>
        Loading...
      </div>
    )
  }

  // Merge server models with our known list (server models take priority for name/description)
  const displayModels = ALL_MODELS.map(known => {
    const serverModel = models.find(m => m.id === known.id)
    return {
      ...known,
      name: serverModel?.name || known.name,
      description: serverModel?.description || '',
      available: (serverModel as ModelInfo & { available?: boolean })?.available ?? known.available,
    }
  })

  const currentModel = displayModels.find(m => m.id === selectedModel) || displayModels[0]

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer"
        style={{
          background: open ? 'var(--bg-elevated)' : 'var(--bg-surface)',
          border: `1px solid ${open ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: 'var(--sage)',
            animation: 'pulse-warm 2s ease-in-out infinite',
          }}
        />
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {currentModel.name}
        </span>
        <svg
          className="w-3 h-3 transition-transform duration-200"
          style={{
            color: 'var(--text-tertiary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden animate-dropdown z-50"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="section-label">Model</span>
          </div>

          <div className="py-1">
            {displayModels.map((model) => {
              const isSelected = model.id === selectedModel
              const isAvailable = model.available

              return (
                <button
                  key={model.id}
                  onClick={() => {
                    if (isAvailable) {
                      onChange(model.id)
                      setOpen(false)
                    }
                  }}
                  disabled={!isAvailable}
                  className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors duration-100"
                  style={{
                    background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                    cursor: isAvailable ? 'pointer' : 'default',
                    opacity: isAvailable ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => {
                    if (isAvailable && !isSelected) {
                      e.currentTarget.style.background = 'var(--bg-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected ? 'var(--accent-subtle)' : 'transparent'
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Status dot */}
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: isAvailable ? 'var(--sage)' : 'var(--text-ghost)',
                      }}
                    />
                    <div className="min-w-0">
                      <span
                        className="text-xs font-medium block"
                        style={{ color: isAvailable ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                      >
                        {model.name}
                      </span>
                      {model.description && (
                        <span
                          className="text-[10px] block truncate mt-0.5"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {model.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: selected check or Coming Soon */}
                  {isSelected && isAvailable ? (
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: 'var(--accent)' }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : !isAvailable ? (
                    <span
                      className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-ghost)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      SOON
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
