import type { ImageRecord } from '../types'
import { getImageUrl } from '../api/client'

interface ReferenceGalleryProps {
  images: ImageRecord[]
  onRemove: (id: string) => void
}

export default function ReferenceGallery({ images, onRemove }: ReferenceGalleryProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-medium text-zinc-300">References</h3>
        {images.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-500 text-[10px] font-semibold text-white">
            {images.length}
          </span>
        )}
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-zinc-600 py-4 text-center">
          No reference images yet
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="rounded-lg overflow-hidden bg-zinc-900 aspect-square">
                <img
                  src={getImageUrl(image.id)}
                  alt={image.originalName}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200" />
                {/* Remove button */}
                <button
                  onClick={() => onRemove(image.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  aria-label="Remove image"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-zinc-500 truncate mt-1.5 px-0.5">
                {image.originalName}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
