import { useState } from 'react'
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  FaceSmileIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import HeatmapViewer from './HeatmapViewer'

function ConfidenceRing({ value, isManipulated }) {
  const percent = Math.round(value * 100)
  const color = isManipulated ? '#ef4444' : '#22c55e'
  const data = [{ value: percent, fill: color }]

  return (
    <div className="relative flex items-center justify-center">
      <RadialBarChart
        width={120}
        height={120}
        innerRadius={40}
        outerRadius={56}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar
          background={{ fill: '#1e2d45' }}
          dataKey="value"
          cornerRadius={4}
          angleAxisId={0}
        />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-display" style={{ color }}>{percent}%</span>
        <span className="text-xs text-veritas-muted font-mono">CONF</span>
      </div>
    </div>
  )
}

export default function ResultCard({ result }) {
  const [showRaw, setShowRaw] = useState(false)

  if (!result) return null

  const { verdict, visual, explainability, media_type, processing_time_seconds, request_id } = result
  const isManipulated = verdict?.is_manipulated
  const confidence = verdict?.confidence ?? 0
  const fakeProbability = verdict?.fake_probability ?? 0

  const handleDownload = () => {
    const exportData = {
      request_id,
      timestamp: new Date().toISOString(),
      verdict,
      visual,
      processing_time_seconds,
      media_type,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `veritas-report-${request_id?.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Verdict Banner */}
      <div className={`relative card overflow-hidden p-6 ${
        isManipulated ? 'glow-danger border-veritas-danger/30' : 'glow-success border-veritas-success/30'
      }`}>
        {/* Background glow */}
        <div className={`absolute inset-0 opacity-5 ${
          isManipulated
            ? 'bg-gradient-to-br from-veritas-danger to-transparent'
            : 'bg-gradient-to-br from-veritas-success to-transparent'
        }`} />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Icon + verdict */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            {isManipulated ? (
              <ShieldExclamationIcon className="w-16 h-16 text-veritas-danger" />
            ) : (
              <ShieldCheckIcon className="w-16 h-16 text-veritas-success" />
            )}
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-widest font-mono ${
              isManipulated
                ? 'bg-veritas-danger/20 text-veritas-danger border border-veritas-danger/40'
                : 'bg-veritas-success/20 text-veritas-success border border-veritas-success/40'
            }`}>
              {isManipulated ? '⚠ MANIPULATED' : '✓ AUTHENTIC'}
            </div>
          </div>

          {/* Confidence ring */}
          <div className="flex-shrink-0">
            <ConfidenceRing value={confidence} isManipulated={isManipulated} />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <p className="label mb-1">Detection Summary</p>
              <p className="text-veritas-text">
                {isManipulated
                  ? `This ${media_type || 'media'} shows signs of AI manipulation with ${Math.round(confidence * 100)}% confidence.`
                  : `This ${media_type || 'media'} appears to be authentic with ${Math.round(confidence * 100)}% confidence.`
                }
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="label mb-1">Fake Probability</p>
                <p className={`value font-mono text-lg ${
                  fakeProbability > 0.5 ? 'text-veritas-danger' : 'text-veritas-success'
                }`}>
                  {(fakeProbability * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="label mb-1">Faces Detected</p>
                <div className="flex items-center gap-1.5">
                  <FaceSmileIcon className="w-4 h-4 text-veritas-accent" />
                  <p className="value font-mono text-lg">{visual?.faces_detected ?? 0}</p>
                </div>
              </div>
              <div>
                <p className="label mb-1">Processing Time</p>
                <div className="flex items-center gap-1.5">
                  <ClockIcon className="w-4 h-4 text-veritas-muted" />
                  <p className="value font-mono text-lg">{processing_time_seconds?.toFixed(2)}s</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manipulation details */}
      {isManipulated && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-veritas-danger" />
            <h3 className="font-display font-semibold text-veritas-text">Suspicious Regions</h3>
          </div>

          {verdict?.affected_regions?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {verdict.affected_regions.map((region, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-veritas-danger/10 border border-veritas-danger/30 text-veritas-danger text-sm font-medium"
                >
                  {region}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-veritas-muted text-sm">Manipulation detected but regions could not be localized.</p>
          )}

          <div>
            <p className="label mb-1">Manipulation Type</p>
            <span className="px-3 py-1 rounded-lg bg-veritas-warning/10 border border-veritas-warning/30 text-veritas-warning text-sm font-mono font-medium uppercase">
              {verdict?.manipulation_type || 'unknown'}
            </span>
          </div>
        </div>
      )}

      {/* Video-specific stats */}
      {media_type === 'video' && visual?.frames_analyzed && (
        <div className="card p-5">
          <h3 className="font-display font-semibold text-veritas-text mb-4">Video Analysis</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="label mb-1">Frames Analyzed</p>
              <p className="value font-mono text-lg">{visual.frames_analyzed}</p>
            </div>
            <div>
              <p className="label mb-1">Duration</p>
              <p className="value font-mono text-lg">{visual.duration_seconds?.toFixed(1)}s</p>
            </div>
            <div>
              <p className="label mb-1">Fake Frame Ratio</p>
              <p className="value font-mono text-lg">{((visual.fake_frame_ratio || 0) * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="label mb-1">Total Faces</p>
              <p className="value font-mono text-lg">{visual.faces_detected}</p>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap */}
      {explainability?.heatmap_base64 && (
        <HeatmapViewer
          heatmapBase64={explainability.heatmap_base64}
          label="GradCAM Activation Map"
        />
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleDownload} className="btn-secondary gap-2">
          <ArrowDownTrayIcon className="w-4 h-4" />
          Download Report
        </button>

        <button
          onClick={() => setShowRaw(!showRaw)}
          className="btn-secondary text-sm"
        >
          {showRaw ? 'Hide' : 'Show'} Raw JSON
        </button>

        <div className="ml-auto">
          <p className="label text-right">Request ID</p>
          <p className="text-veritas-muted font-mono text-xs">{request_id}</p>
        </div>
      </div>

      {/* Raw JSON */}
      {showRaw && (
        <div className="card p-4">
          <pre className="text-xs font-mono text-veritas-muted overflow-auto max-h-96 whitespace-pre-wrap break-all">
            {JSON.stringify({ ...result, explainability: { ...result.explainability, heatmap_base64: '[truncated]' } }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
