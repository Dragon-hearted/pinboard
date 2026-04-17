import type { GenerationResult } from '../types'

interface GenerationHistoryProps {
  generations: GenerationResult[]
  onSelect: (generation: GenerationResult) => void
  selectedId?: string
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function GenerationHistory({ generations, onSelect, selectedId }: GenerationHistoryProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="px-4 py-4"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between">
          <span className="section-label">History</span>
          {generations.length > 0 && (
            <span className="font-mono text-[10px]" style={{ color: 'var(--text-ghost)' }}>
              {generations.length}
            </span>
          )}
        </div>
      </div>

      {generations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-center" style={{ color: 'var(--text-ghost)' }}>
            Generated images will appear here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {generations.map((gen) => {
            const isSelected = gen.id === selectedId
            return (
              <button
                key={gen.id}
                onClick={() => onSelect(gen)}
                className="w-full text-left flex gap-2.5 p-2 rounded-lg transition-all duration-150 cursor-pointer"
                style={{
                  background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                  borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-surface)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <div
                  className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden"
                  style={{
                    background: 'var(--bg-elevated)',
                    boxShadow: isSelected ? '0 0 0 1px rgba(224, 122, 95, 0.2)' : 'none',
                  }}
                >
                  <img src={gen.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[11px] leading-snug"
                    style={{
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {gen.prompt}
                  </p>
                  <span className="text-[10px] mt-0.5 block font-mono" style={{ color: 'var(--text-ghost)' }}>
                    {formatTimestamp(gen.createdAt)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
