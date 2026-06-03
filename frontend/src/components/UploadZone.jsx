import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  FilmIcon,
  XMarkIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { detectFile } from '../services/api'

const MAX_SIZE = 50 * 1024 * 1024 // 50MB
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'video/mp4': ['.mp4'],
  'video/avi': ['.avi'],
  'video/quicktime': ['.mov'],
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function UploadZone({ onSampleClick }) {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  const isVideo = file?.type?.startsWith('video/')

  const onDrop = useCallback((accepted, rejected) => {
    setError(null)
    if (rejected.length > 0) {
      const err = rejected[0].errors[0]
      if (err.code === 'file-too-large') {
        setError('File exceeds 50MB limit')
      } else if (err.code === 'file-invalid-type') {
        setError('Unsupported file type. Use JPG, PNG, MP4, AVI, or MOV')
      } else {
        setError(err.message)
      }
      return
    }
    if (accepted.length > 0) {
      const f = accepted[0]
      setFile(f)
      if (f.type.startsWith('image/')) {
        const url = URL.createObjectURL(f)
        setPreview(url)
      } else {
        setPreview(null)
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      const result = await detectFile(file, setProgress)
      navigate(`/result/${result.request_id}`)
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.')
      setUploading(false)
    }
  }

  const handleClear = (e) => {
    e.stopPropagation()
    setFile(null)
    setPreview(null)
    setError(null)
    setProgress(0)
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden
          ${isDragActive
            ? 'border-veritas-accent bg-veritas-accent/5 scale-[1.01]'
            : file
            ? 'border-veritas-border bg-veritas-surface'
            : 'border-veritas-border bg-veritas-surface hover:border-veritas-accent/50 hover:bg-veritas-accent/5'
          }`}
      >
        <input {...getInputProps()} />

        {/* Scan line effect when dragging */}
        {isDragActive && <div className="scan-line" />}

        {!file ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-8">
            <div className={`relative transition-transform duration-300 ${isDragActive ? 'scale-110' : ''}`}>
              <CloudArrowUpIcon className="w-16 h-16 text-veritas-muted" />
              {isDragActive && (
                <div className="absolute inset-0 bg-veritas-accent/20 blur-xl rounded-full" />
              )}
            </div>
            <div className="text-center space-y-2">
              <p className="font-display font-semibold text-veritas-text text-lg">
                {isDragActive ? 'Drop to analyze' : 'Drop media here'}
              </p>
              <p className="text-veritas-muted text-sm">
                or <span className="text-veritas-accent hover:underline">browse files</span>
              </p>
              <p className="text-veritas-muted/70 text-xs font-mono">
                JPG · PNG · MP4 · AVI · MOV — max 50MB
              </p>
            </div>
          </div>
        ) : (
          /* File selected state */
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Preview or icon */}
              <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-veritas-bg flex items-center justify-center border border-veritas-border">
                {preview ? (
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <FilmIcon className="w-8 h-8 text-veritas-accent" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-veritas-text truncate">{file.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="label">{formatSize(file.size)}</span>
                  <span className="label">{isVideo ? 'VIDEO' : 'IMAGE'}</span>
                  <span className="label text-veritas-accent">READY</span>
                </div>
              </div>

              {/* Clear button */}
              {!uploading && (
                <button
                  onClick={handleClear}
                  className="flex-shrink-0 p-1.5 rounded-lg text-veritas-muted hover:text-veritas-danger hover:bg-veritas-danger/10 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Progress bar */}
            {uploading && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-veritas-muted font-mono">
                    {progress < 100 ? 'Uploading...' : 'Processing...'}
                  </span>
                  <span className="text-veritas-accent font-mono">{progress}%</span>
                </div>
                <div className="h-1.5 bg-veritas-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-veritas-accent to-sky-400 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-veritas-danger/10 border border-veritas-danger/30 text-veritas-danger text-sm flex items-center gap-2">
          <span className="font-mono text-xs">ERROR</span>
          <span>{error}</span>
        </div>
      )}

      {/* Upload button */}
      {file && !uploading && (
        <button
          onClick={handleUpload}
          className="w-full btn-primary justify-center text-base py-4 rounded-xl glow-accent"
        >
          <span>Analyze for Deepfakes</span>
          <ArrowRightIcon className="w-5 h-5" />
        </button>
      )}

      {/* Sample test section */}
      {!file && onSampleClick && (
        <div className="text-center pt-2">
          <p className="text-veritas-muted text-sm mb-3">
            No file? Try a sample:
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => onSampleClick('authentic')}
              className="px-4 py-2 rounded-lg border border-veritas-success/40 bg-veritas-success/10 text-veritas-success text-sm font-medium hover:bg-veritas-success/20 transition-colors"
            >
              ✓ Sample Authentic
            </button>
            <button
              onClick={() => onSampleClick('manipulated')}
              className="px-4 py-2 rounded-lg border border-veritas-danger/40 bg-veritas-danger/10 text-veritas-danger text-sm font-medium hover:bg-veritas-danger/20 transition-colors"
            >
              ✗ Sample Manipulated
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
