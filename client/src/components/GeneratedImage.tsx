interface GeneratedImageProps {
  imageUrl?: string
  loading?: boolean
  prompt?: string
}

export default function GeneratedImage({ imageUrl, loading, prompt }: GeneratedImageProps) {
  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
      {loading ? (
        <div className="aspect-video bg-zinc-800 flex items-center justify-center relative overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent animate-pulse" />
          <div className="flex flex-col items-center gap-3 z-10">
            <div className="w-10 h-10 rounded-full border-2 border-accent-500 border-t-transparent animate-spin" />
            <p className="text-sm text-zinc-500">Generating image...</p>
          </div>
        </div>
      ) : imageUrl ? (
        <div>
          <div className="flex items-center justify-center bg-zinc-950/50">
            <img
              src={imageUrl}
              alt={prompt || 'Generated image'}
              className="object-contain max-h-[500px] mx-auto animate-fade-in"
            />
          </div>
          {prompt && (
            <div className="p-4 border-t border-zinc-800/50">
              <p className="text-sm text-zinc-400 italic">{prompt}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video bg-zinc-900/50 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-zinc-600"
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
          <p className="text-sm text-zinc-600">Generated image will appear here</p>
        </div>
      )}
    </div>
  )
}
