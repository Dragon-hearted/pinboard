interface GeneratedImageProps {
  imageUrl?: string
  loading?: boolean
  prompt?: string
  onRegenerate: () => void
  onUseAsReference: () => void
  onDownload: () => void
  disabled?: boolean
}

export default function GeneratedImage({
  imageUrl,
  loading,
  prompt,
  onRegenerate,
  onUseAsReference,
  onDownload,
  disabled,
}: GeneratedImageProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 relative">
      {loading ? (
        /* Loading state */
        <div
          className="w-full max-w-2xl aspect-[4/3] rounded-2xl flex items-center justify-center"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent"
              style={{
                borderColor: 'var(--accent)',
                borderTopColor: 'transparent',
                opacity: 0.6,
                animation: 'spin-slow 1s linear infinite',
              }}
            />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Creating your image...</p>
          </div>
        </div>
      ) : imageUrl ? (
        /* Generated image with action bar */
        <div className="relative max-w-3xl w-full animate-fade-in">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <img
              src={imageUrl}
              alt={prompt || 'Generated image'}
              className="w-full h-auto max-h-[calc(100vh-8rem)] object-contain"
              style={{ background: 'var(--bg-panel)' }}
            />
          </div>

          {/* Prompt caption */}
          {prompt && (
            <div className="mt-4 px-1">
              <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                &ldquo;{prompt}&rdquo;
              </p>
            </div>
          )}

          {/* Action bar */}
          <div
            className={`
              absolute bottom-4 left-1/2 -translate-x-1/2
              flex items-center gap-1.5 px-2.5 py-2 rounded-xl
              glass
              ${disabled ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <button
              onClick={onRegenerate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.background = 'rgba(255, 235, 210, 0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.background = 'transparent'
              }}
              title="Regenerate"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Redo
            </button>

            <div className="w-px h-5" style={{ background: 'var(--border-medium)' }} />

            <button
              onClick={onUseAsReference}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ color: 'var(--accent)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent-hover)'
                e.currentTarget.style.background = 'var(--accent-subtle)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--accent)'
                e.currentTarget.style.background = 'transparent'
              }}
              title="Use as reference"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Use as ref
            </button>

            <div className="w-px h-5" style={{ background: 'var(--border-medium)' }} />

            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.background = 'rgba(255, 235, 210, 0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.background = 'transparent'
              }}
              title="Download"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
              </svg>
              Save
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center gap-5 text-center">
          {/* Decorative element - overlapping shapes */}
          <div className="relative w-16 h-16">
            <div
              className="absolute inset-0 rounded-xl rotate-12"
              style={{ border: '1px solid var(--border-medium)', opacity: 0.4 }}
            />
            <div
              className="absolute inset-1 rounded-xl -rotate-6"
              style={{ border: '1px solid var(--border-medium)', opacity: 0.6 }}
            />
            <div
              className="absolute inset-2 rounded-xl flex items-center justify-center"
              style={{ border: '1px solid var(--border-strong)' }}
            >
              <svg
                className="w-5 h-5"
                style={{ color: 'var(--text-ghost)' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Your canvas awaits</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-ghost)' }}>Upload references and describe your vision</p>
          </div>
        </div>
      )}
    </div>
  )
}
