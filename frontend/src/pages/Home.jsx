import { useNavigate } from 'react-router-dom'
import UploadZone from '../components/UploadZone'
import {
  BoltIcon,
  EyeIcon,
  BeakerIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

const FEATURES = [
  {
    icon: BoltIcon,
    title: 'Real-time Analysis',
    desc: 'Get results in seconds with our optimized inference pipeline.',
    color: 'text-veritas-accent',
    bg: 'bg-veritas-accent/10',
  },
  {
    icon: EyeIcon,
    title: 'Explainable AI',
    desc: 'GradCAM heatmaps reveal exactly which facial regions triggered the alert.',
    color: 'text-veritas-warning',
    bg: 'bg-veritas-warning/10',
  },
  {
    icon: BeakerIcon,
    title: 'Ensemble Detection',
    desc: 'EfficientNet-B4 backbone with multi-face aggregation for robust accuracy.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Video Support',
    desc: 'Frame-by-frame temporal analysis with majority voting across sampled frames.',
    color: 'text-veritas-success',
    bg: 'bg-veritas-success/10',
  },
]

// Generate a deterministic-looking sample image as base64 PNG (1x1 px placeholders for demo)
function createSampleBlob(type) {
  // Create a simple canvas image representing authentic/manipulated
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 200
  const ctx = canvas.getContext('2d')

  if (type === 'authentic') {
    // Green-toned face placeholder
    ctx.fillStyle = '#1a2e1a'
    ctx.fillRect(0, 0, 200, 200)
    ctx.fillStyle = '#4ade80'
    ctx.beginPath()
    ctx.arc(100, 85, 55, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#86efac'
    ctx.beginPath()
    ctx.arc(100, 85, 30, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#22c55e'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('AUTHENTIC SAMPLE', 100, 175)
  } else {
    // Red-toned face placeholder
    ctx.fillStyle = '#2e1a1a'
    ctx.fillRect(0, 0, 200, 200)
    ctx.fillStyle = '#f87171'
    ctx.beginPath()
    ctx.arc(100, 85, 55, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fca5a5'
    ctx.beginPath()
    ctx.arc(100, 85, 30, 0, Math.PI * 2)
    ctx.fill()
    // Distortion lines
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo(60 + i * 20, 60)
      ctx.lineTo(60 + i * 20 + 10, 120)
      ctx.stroke()
    }
    ctx.fillStyle = '#ef4444'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('MANIPULATED SAMPLE', 100, 175)
  }

  return new Promise(resolve => {
    canvas.toBlob(blob => {
      const file = new File([blob], `sample_${type}.png`, { type: 'image/png' })
      resolve(file)
    }, 'image/png')
  })
}

export default function Home() {
  const navigate = useNavigate()

  const handleSampleClick = async (type) => {
    try {
      const { detectFile } = await import('../services/api')
      const file = await createSampleBlob(type)
      const result = await detectFile(file)
      navigate(`/result/${result.request_id}`)
    } catch (err) {
      console.error('Sample test failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-grid">
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-12">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-veritas-accent/5 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-veritas-surface border border-veritas-border text-sm text-veritas-muted mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-veritas-accent animate-pulse" />
            <span className="font-mono">AI DETECTION ENGINE v1.0</span>
          </div>

          {/* Title */}
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-4">
            Veritas
            <span className="text-veritas-accent"> AI</span>
          </h1>

          <p className="text-xl text-veritas-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Detect deepfakes and AI-generated media with explainable neural network analysis.
            Know the truth in seconds.
          </p>

          {/* Upload zone + YouTube */}
          <div className="flex flex-col lg:flex-row items-start gap-6 text-left">
            <div className="w-full lg:flex-1">
              <UploadZone onSampleClick={handleSampleClick} />
            </div>
            <div className="w-full lg:w-[380px] shrink-0">
              <p className="text-xs font-mono text-veritas-muted mb-2 uppercase tracking-widest">See it in action</p>
              <div className="rounded-xl overflow-hidden border border-veritas-border aspect-video">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/Q_z5_wUpu_Y"
                  title="Veritas AI Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 pt-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="card p-5 hover:border-veritas-accent/30 transition-colors group">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-display font-semibold text-veritas-text mb-2">{title}</h3>
              <p className="text-veritas-muted text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Tech stack */}
        <div className="mt-12 pt-8 border-t border-veritas-border">
          <p className="text-center label mb-6">Powered by</p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-veritas-muted/60">
            {['PyTorch', 'EfficientNet-B4', 'GradCAM', 'MTCNN', 'FastAPI', 'React'].map(tech => (
              <span key={tech} className="font-mono text-sm px-3 py-1.5 rounded-lg bg-veritas-surface border border-veritas-border/50">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
