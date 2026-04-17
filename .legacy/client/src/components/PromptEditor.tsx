import { useRef, useState, useCallback, useEffect } from 'react'
import type { TaggedImage } from '../types'

interface PromptEditorProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  loading?: boolean
  images: TaggedImage[]
}

interface AutocompleteState {
  open: boolean
  index: number
  triggerPos: number
}

export default function PromptEditor({ value, onChange, onSubmit, disabled, loading, images }: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [autocomplete, setAutocomplete] = useState<AutocompleteState>({
    open: false,
    index: 0,
    triggerPos: -1,
  })

  // Build the filtered list of images matching the partial query after @
  const getFilteredImages = useCallback((): TaggedImage[] => {
    if (!autocomplete.open || autocomplete.triggerPos < 0) return []
    const cursorPos = textareaRef.current?.selectionStart ?? value.length
    const query = value.slice(autocomplete.triggerPos + 1, cursorPos)
    if (query.length === 0) return images
    return images.filter(
      (img) =>
        String(img.tag).startsWith(query) ||
        img.originalName.toLowerCase().includes(query.toLowerCase())
    )
  }, [autocomplete.open, autocomplete.triggerPos, value, images])

  const filteredImages = getFilteredImages()

  // Close autocomplete if no matches
  useEffect(() => {
    if (autocomplete.open && filteredImages.length === 0) {
      const cursorPos = textareaRef.current?.selectionStart ?? value.length
      const query = value.slice(autocomplete.triggerPos + 1, cursorPos)
      if (query.length > 0) {
        setAutocomplete({ open: false, index: 0, triggerPos: -1 })
      }
    }
  }, [autocomplete.open, autocomplete.triggerPos, filteredImages.length, value])

  // Clamp index when filtered list shrinks
  useEffect(() => {
    if (autocomplete.index >= filteredImages.length && filteredImages.length > 0) {
      setAutocomplete((prev) => ({ ...prev, index: filteredImages.length - 1 }))
    }
  }, [filteredImages.length, autocomplete.index])

  const insertReference = useCallback(
    (img: TaggedImage) => {
      const cursorPos = textareaRef.current?.selectionStart ?? value.length
      const before = value.slice(0, autocomplete.triggerPos)
      const after = value.slice(cursorPos)
      const insertion = `@${img.tag}`
      const newValue = before + insertion + (after.startsWith(' ') ? '' : ' ') + after
      onChange(newValue)
      setAutocomplete({ open: false, index: 0, triggerPos: -1 })

      requestAnimationFrame(() => {
        const ta = textareaRef.current
        if (ta) {
          ta.focus()
          const pos = before.length + insertion.length + (after.startsWith(' ') ? 0 : 1)
          ta.selectionStart = pos
          ta.selectionEnd = pos
        }
      })
    },
    [autocomplete.triggerPos, value, onChange]
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart ?? newValue.length
    onChange(newValue)

    if (
      images.length > 0 &&
      cursorPos > 0 &&
      newValue[cursorPos - 1] === '@' &&
      (cursorPos === 1 || /\s/.test(newValue[cursorPos - 2]))
    ) {
      setAutocomplete({ open: true, index: 0, triggerPos: cursorPos - 1 })
    } else if (autocomplete.open) {
      const triggerChar = newValue[autocomplete.triggerPos]
      if (triggerChar !== '@') {
        setAutocomplete({ open: false, index: 0, triggerPos: -1 })
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (autocomplete.open && filteredImages.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setAutocomplete((prev) => ({
          ...prev,
          index: (prev.index + 1) % filteredImages.length,
        }))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setAutocomplete((prev) => ({
          ...prev,
          index: (prev.index - 1 + filteredImages.length) % filteredImages.length,
        }))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertReference(filteredImages[autocomplete.index])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setAutocomplete({ open: false, index: 0, triggerPos: -1 })
        return
      }
    }

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !disabled && !loading) {
      e.preventDefault()
      onSubmit()
    }
  }

  // Count valid @N references in prompt
  const refCount = (value.match(/@(\d+)/g) || []).filter((match) => {
    const num = parseInt(match.slice(1), 10)
    return num >= 1 && num <= images.length
  }).length

  // Build parsed preview with highlighted references
  const renderPreview = () => {
    if (value.trim().length === 0) return null

    const parts: React.ReactNode[] = []
    const regex = /@(\d+)/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(value)) !== null) {
      const tagNum = parseInt(match[1], 10)
      if (match.index > lastIndex) {
        parts.push(
          <span key={`t-${lastIndex}`}>{value.slice(lastIndex, match.index)}</span>
        )
      }

      const img = images.find((i) => i.tag === tagNum)
      if (img) {
        parts.push(
          <span key={`r-${match.index}`} className="tag-ref">
            @{tagNum}
            <span className="text-xs ml-0.5" style={{ color: 'var(--accent)', opacity: 0.5 }}>({img.originalName})</span>
          </span>
        )
      } else {
        parts.push(
          <span key={`r-${match.index}`} style={{ color: 'var(--text-ghost)' }}>@{tagNum}</span>
        )
      }
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < value.length) {
      parts.push(<span key={`t-${lastIndex}`}>{value.slice(lastIndex)}</span>)
    }

    return (
      <div
        className="px-4 py-2 text-xs leading-relaxed"
        style={{
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {parts}
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Label */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="section-label">Prompt</span>
        {images.length > 0 && (
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-ghost)' }}>
            Use @1{images.length > 1 ? `-@${images.length}` : ''} to reference
          </span>
        )}
      </div>

      {/* Textarea */}
      <div className="relative px-4">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            images.length > 0
              ? "Describe changes... e.g. 'Use bg of @1 with pose from @2'"
              : 'Describe the image you want to generate...'
          }
          disabled={disabled || loading}
          className="w-full h-28 bg-transparent border-none resize-none focus:outline-none text-sm leading-relaxed"
          style={{
            color: 'var(--text-primary)',
            caretColor: 'var(--accent)',
          }}
        />

        {/* Autocomplete dropdown */}
        {autocomplete.open && filteredImages.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 autocomplete-dropdown rounded-lg overflow-hidden z-50">
            {filteredImages.map((img, i) => (
              <button
                key={img.id}
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertReference(img)
                }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                style={{
                  background: i === autocomplete.index ? 'var(--accent-muted)' : 'transparent',
                  color: i === autocomplete.index ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <span className="font-mono text-xs font-medium" style={{ color: 'var(--accent)' }}>@{img.tag}</span>
                <span style={{ color: 'var(--text-ghost)' }}>&middot;</span>
                <span className="truncate">{img.originalName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Parsed prompt preview */}
      {renderPreview()}

      {/* Footer */}
      <div
        className="flex justify-between items-center px-4 py-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px]" style={{ color: 'var(--text-ghost)' }}>{value.length} chars</span>
          {refCount > 0 && (
            <span className="text-[11px] font-mono" style={{ color: 'var(--accent)', opacity: 0.7 }}>
              {refCount} ref{refCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] hidden sm:block" style={{ color: 'var(--text-ghost)' }}>
            {navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter
          </span>
          <button
            onClick={onSubmit}
            disabled={disabled || loading || value.trim().length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              background: (disabled || loading || value.trim().length === 0)
                ? 'var(--bg-elevated)'
                : 'var(--accent)',
              color: (disabled || loading || value.trim().length === 0)
                ? 'var(--text-ghost)'
                : '#fff',
              cursor: (disabled || loading || value.trim().length === 0) ? 'not-allowed' : 'pointer',
              boxShadow: !(disabled || loading || value.trim().length === 0)
                ? '0 0 20px rgba(224, 122, 95, 0.2), 0 0 60px rgba(224, 122, 95, 0.05)'
                : 'none',
            }}
          >
            {loading ? (
              <>
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent"
                  style={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderTopColor: 'transparent',
                    animation: 'spin-slow 0.8s linear infinite',
                  }}
                />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span>Generate</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
