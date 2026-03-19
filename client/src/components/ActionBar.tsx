interface ActionBarProps {
  onRegenerate: () => void
  onUseAsReference: () => void
  onDownload: () => void
  disabled?: boolean
  imageUrl?: string
}

export default function ActionBar({
  onRegenerate,
  onUseAsReference,
  onDownload,
  disabled,
  imageUrl,
}: ActionBarProps) {
  if (!imageUrl) return null

  const baseButtonClass =
    'flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-150'

  return (
    <div
      className={`flex flex-wrap gap-3 py-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Regenerate */}
      <button
        onClick={onRegenerate}
        className={`${baseButtonClass} bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300`}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
        Regenerate
      </button>

      {/* Use as Reference */}
      <button
        onClick={onUseAsReference}
        className={`${baseButtonClass} bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 border border-accent-500/30`}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Use as Reference
      </button>

      {/* Download */}
      <button
        onClick={onDownload}
        className={`${baseButtonClass} bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300`}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
        </svg>
        Download
      </button>
    </div>
  )
}
