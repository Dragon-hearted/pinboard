import type { TaggedImage } from '../types'
import { getImageUrl } from '../api/client'

interface ReferenceGalleryProps {
  images: TaggedImage[]
  onRemove: (id: string) => void
  onToggleMode: (id: string) => void
}

export default function ReferenceGallery({ images, onRemove, onToggleMode }: ReferenceGalleryProps) {
  if (images.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="section-label">References</span>
        <span className="font-mono text-[10px]" style={{ color: 'var(--text-ghost)' }}>
          {images.length} image{images.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-1.5">
        {images.map((image) => (
          <div
            key={image.id}
            className="group flex items-center gap-3 p-2 rounded-lg transition-all duration-150"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-medium)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
            }}
          >
            {/* Thumbnail with tag overlay */}
            <div
              className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <img
                src={getImageUrl(image.id)}
                alt={image.originalName}
                className="w-full h-full object-cover"
              />
              {/* Tag badge */}
              <div className="absolute inset-x-0 bottom-0 px-1.5 py-0.5" style={{ background: 'rgba(20, 18, 16, 0.8)' }}>
                <span className="text-[10px] font-mono font-medium" style={{ color: 'var(--accent)' }}>
                  @{image.tag}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{image.originalName}</p>
              {/* Mode toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleMode(image.id) }}
                className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-medium cursor-pointer transition-colors"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: image.referenceMode === 'generation' ? 'var(--accent)' : 'var(--text-ghost)',
                  }}
                />
                <span style={{
                  color: image.referenceMode === 'generation' ? 'var(--accent)' : 'var(--text-ghost)',
                }}>
                  {image.referenceMode === 'generation' ? 'ref' : 'context'}
                </span>
              </button>
            </div>

            {/* Remove */}
            <button
              onClick={() => onRemove(image.id)}
              className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150"
              style={{ color: 'var(--text-ghost)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--danger-muted)'
                e.currentTarget.style.color = 'var(--danger)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-ghost)'
              }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
