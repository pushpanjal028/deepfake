import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { getStatus } from '../services/api'
import ResultCard from '../components/ResultCard'
import LoadingSpinner from '../components/LoadingSpinner'

const POLL_INTERVAL = 2000
const MAX_POLLS = 60 // 2 min timeout

const PROCESSING_MESSAGES = [
  'Extracting facial landmarks...',
  'Running EfficientNet-B4 inference...',
  'Computing GradCAM activations...',
  'Aggregating ensemble predictions...',
  'Generating explainability heatmap...',
  'Finalizing analysis report...',
]

export default function ResultPage() {
  const { requestId } = useParams()
  const navigate = useNavigate()

  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState(null)
  const [msgIndex, setMsgIndex] = useState(0)
  const [pollCount, setPollCount] = useState(0)

  const pollTimer = useRef(null)
  const msgTimer = useRef(null)

  useEffect(() => {
    if (!requestId) {
      setError('No request ID provided')
      return
    }

    // Cycle processing messages
    msgTimer.current = setInterval(() => {
      setMsgIndex(i => (i + 1) % PROCESSING_MESSAGES.length)
    }, 1800)

    // Start polling
    const poll = async () => {
      try {
        const data = await getStatus(requestId)
        setPollCount(c => c + 1)

        if (data.status === 'completed') {
          clearInterval(pollTimer.current)
          clearInterval(msgTimer.current)
          setResult(data)
          setStatus('completed')
        } else if (data.status === 'failed') {
          clearInterval(pollTimer.current)
          clearInterval(msgTimer.current)
          setError(data.error || 'Detection failed')
          setStatus('failed')
        } else if (pollCount >= MAX_POLLS) {
          clearInterval(pollTimer.current)
          setError('Processing timed out. Please try again.')
          setStatus('timeout')
        }
      } catch (err) {
        if (err.message?.includes('404')) {
          setError('Request not found. It may have expired.')
          setStatus('not_found')
          clearInterval(pollTimer.current)
        }
        // Otherwise just keep polling
      }
    }

    poll() // immediate first check
    pollTimer.current = setInterval(poll, POLL_INTERVAL)

    return () => {
      clearInterval(pollTimer.current)
      clearInterval(msgTimer.current)
    }
  }, [requestId])

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back nav */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-veritas-muted hover:text-veritas-text transition-colors group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm">New Analysis</span>
          </Link>

          {status === 'completed' && (
            <div className="flex items-center gap-2 text-xs text-veritas-muted font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-veritas-success" />
              ANALYSIS COMPLETE
            </div>
          )}
        </div>

        {/* Processing state */}
        {status === 'processing' && (
          <div className="card p-8">
            {/* Animated scan header */}
            <div className="relative overflow-hidden h-1 bg-veritas-border rounded-full mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-veritas-accent to-transparent animate-pulse" />
            </div>

            <LoadingSpinner
              message="Analyzing Media"
              subMessage={PROCESSING_MESSAGES[msgIndex]}
            />

            {/* Pipeline steps */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                'Face Detection',
                'Preprocessing',
                'Neural Inference',
                'Ensemble Voting',
                'GradCAM',
                'Report Gen',
              ].map((step, i) => (
                <div
                  key={step}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border transition-all duration-500 ${
                    i <= msgIndex
                      ? 'border-veritas-accent/30 bg-veritas-accent/5 text-veritas-accent'
                      : 'border-veritas-border/50 text-veritas-muted/50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    i < msgIndex
                      ? 'bg-veritas-success'
                      : i === msgIndex
                      ? 'bg-veritas-accent animate-pulse'
                      : 'bg-veritas-border'
                  }`} />
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {(status === 'failed' || status === 'timeout' || status === 'not_found') && (
          <div className="card p-8 text-center space-y-4 border-veritas-danger/30 glow-danger">
            <div className="text-5xl">⚠</div>
            <div>
              <h2 className="font-display text-xl font-semibold text-veritas-danger mb-2">
                Analysis Failed
              </h2>
              <p className="text-veritas-muted text-sm max-w-md mx-auto">{error}</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="btn-primary"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Result state */}
        {status === 'completed' && result && (
          <ResultCard result={result} />
        )}
      </div>
    </div>
  )
}
