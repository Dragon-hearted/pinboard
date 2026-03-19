interface PromptEditorProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  loading?: boolean
}

export default function PromptEditor({
  value,
  onChange,
  onSubmit,
  disabled,
  loading,
}: PromptEditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !disabled && !loading) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe the changes you want to make..."
        disabled={disabled || loading}
        className="w-full h-24 bg-transparent border-none resize-none text-zinc-100 placeholder-zinc-600 focus:outline-none text-sm leading-relaxed"
      />

      {/* Footer */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-800/50">
        <span className="text-xs text-zinc-500">{value.length} characters</span>

        <button
          onClick={onSubmit}
          disabled={disabled || loading || value.trim().length === 0}
          className={`
            flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium
            transition-colors duration-150
            ${
              disabled || loading || value.trim().length === 0
                ? 'bg-accent-500/50 text-white/50 cursor-not-allowed'
                : 'bg-accent-500 hover:bg-accent-600 text-white'
            }
          `}
        >
          {loading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating...
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
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  )
}
