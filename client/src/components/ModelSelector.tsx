import type { ModelInfo } from '../types'

interface ModelSelectorProps {
  models: ModelInfo[]
  selectedModel: string
  onChange: (modelId: string) => void
}

export default function ModelSelector({ models, selectedModel, onChange }: ModelSelectorProps) {
  if (models.length === 0) {
    return (
      <div className="text-sm text-zinc-500 px-3 py-1.5">Loading models...</div>
    )
  }

  return (
    <select
      value={selectedModel}
      onChange={(e) => onChange(e.target.value)}
      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-colors cursor-pointer appearance-none pr-8"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.5rem center',
        backgroundSize: '1rem',
      }}
    >
      {models.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </select>
  )
}
