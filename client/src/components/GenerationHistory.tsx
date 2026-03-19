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

export default function GenerationHistory({
  generations,
  onSelect,
  selectedId,
}: GenerationHistoryProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3">
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
          History
        </h2>
      </div>

      {generations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-600">No generations yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-4">
          {generations.map((gen) => {
            const isSelected = gen.id === selectedId
            return (
              <button
                key={gen.id}
                onClick={() => onSelect(gen)}
                className={`
                  w-full text-left flex gap-3 p-3 cursor-pointer rounded-lg mx-2 transition-colors duration-150
                  ${
                    isSelected
                      ? 'bg-zinc-800 border-l-2 border-accent-500'
                      : 'hover:bg-zinc-800/50 border-l-2 border-transparent'
                  }
                `}
                style={{ width: 'calc(100% - 1rem)' }}
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-zinc-800">
                  <img
                    src={gen.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm text-zinc-300 leading-snug"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {gen.prompt}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-zinc-500">{gen.model}</span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-xs text-zinc-500">
                      {formatTimestamp(gen.createdAt)}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
