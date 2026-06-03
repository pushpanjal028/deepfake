import { useState } from 'react'
import { EyeIcon, FireIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'

const VIEW_MODES = [
  { id: 'overlay', label: 'Overlay', icon: AdjustmentsHorizontalIcon },
  { id: 'heatmap', label: 'Heatmap', icon: FireIcon },
]

export default function HeatmapViewer({ heatmapBase64, label = 'Activation Heatmap' }) {
  const [mode, setMode] = useState('overlay')
  const [zoom, setZoom] = useState(1)

  if (!heatmapBase64) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center gap-3 min-h-48">
        <EyeIcon className="w-10 h-10 text-veritas-muted/50" />
        <p className="text-veritas-muted text-sm">No heatmap available</p>
      </div>
    )
  }

  const src = `data:image/jpeg;base64,${heatmapBase64}`

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-veritas-border">
        <div className="flex items-center gap-2">
          <FireIcon className="w-4 h-4 text-veritas-accent" />
          <span className="text-sm font-medium text-veritas-text">{label}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode switcher */}
          <div className="flex bg-veritas-bg rounded-lg p-0.5 gap-0.5">
            {VIEW_MODES.map(({ id, label: mLabel, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === id
                    ? 'bg-veritas-accent text-white'
                    : 'text-veritas-muted hover:text-veritas-text'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{mLabel}</span>
              </button>
            ))}
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              className="w-6 h-6 rounded text-veritas-muted hover:text-veritas-text hover:bg-veritas-border flex items-center justify-center text-sm"
            >
              −
            </button>
            <span className="text-xs font-mono text-veritas-muted w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              className="w-6 h-6 rounded text-veritas-muted hover:text-veritas-text hover:bg-veritas-border flex items-center justify-center text-sm"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Image area */}
      <div className="relative overflow-auto bg-veritas-bg" style={{ maxHeight: '400px' }}>
        <div
          className="relative inline-block transition-transform duration-200 cursor-zoom-in"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          onClick={() => setZoom(z => z === 1 ? 2 : 1)}
        >
          <img
            src={src}
            alt="Deepfake activation heatmap"
            className="block max-w-full"
            style={{
              filter: mode === 'heatmap' ? 'saturate(1.5) contrast(1.1)' : 'none',
            }}
          />

          {/* Overlay grid lines */}
          {mode === 'overlay' && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(14,165,233,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.08) 1px, transparent 1px)',
                backgroundSize: '33.33% 33.33%',
              }}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-veritas-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-3 rounded-sm" style={{
              background: 'linear-gradient(90deg, #0000ff, #00ff00, #ffff00, #ff0000)'
            }} />
          </div>
          <div className="flex items-center justify-between text-xs text-veritas-muted w-16">
            <span>Safe</span>
            <span>Alert</span>
          </div>
        </div>
        <p className="text-xs text-veritas-muted font-mono">Click image to zoom</p>
      </div>
    </div>
  )
}
