import { useCallback, useRef, useState } from 'react'

interface ImageUploaderProps {
  onUpload: (files: File[]) => void
  uploading?: boolean
  hasImages?: boolean
}

export default function ImageUploader({ onUpload, uploading, hasImages }: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) onUpload(files)
  }, [onUpload])

  const handleClick = () => inputRef.current?.click()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length > 0) onUpload(files)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Compact mode when images already exist
  if (hasImages) {
    return (
      <div>
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleChange} className="hidden" />
        <button
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
          style={{
            color: uploading ? 'var(--text-ghost)' : dragOver ? 'var(--accent)' : 'var(--text-secondary)',
            background: dragOver ? 'var(--accent-subtle)' : 'transparent',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!uploading && !dragOver) {
              e.currentTarget.style.background = 'var(--bg-surface)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!dragOver) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }
          }}
        >
          {uploading ? (
            <>
              <div
                className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent', animation: 'spin-slow 0.8s linear infinite' }}
              />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Add more</span>
            </>
          )}
        </button>
      </div>
    )
  }

  // Full upload area when no images
  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group"
      style={{
        border: `1px dashed ${dragOver ? 'var(--accent)' : 'var(--border-medium)'}`,
        background: dragOver ? 'var(--accent-subtle)' : 'transparent',
        opacity: uploading ? 0.6 : 1,
        pointerEvents: uploading ? 'none' : 'auto',
      }}
      onMouseEnter={(e) => {
        if (!dragOver) {
          e.currentTarget.style.borderColor = 'var(--border-strong)'
          e.currentTarget.style.background = 'var(--bg-surface)'
        }
      }}
      onMouseLeave={(e) => {
        if (!dragOver) {
          e.currentTarget.style.borderColor = 'var(--border-medium)'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleChange} className="hidden" />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent', animation: 'spin-slow 0.8s linear infinite' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Uploading...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'var(--bg-surface)' }}
          >
            <svg
              className="w-5 h-5 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Add reference images
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Drop images or click to browse
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
