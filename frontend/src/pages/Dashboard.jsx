import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getResults } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

function StatCard({ label, value, sub, color = 'text-veritas-text' }) {
  return (
    <div className="card p-5">
      <p className="label mb-2">{label}</p>
      <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-veritas-muted text-sm mt-1">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="card px-3 py-2 text-xs">
        <p className="text-veritas-muted">{label}</p>
        <p className="text-veritas-accent font-mono">{(payload[0].value * 100).toFixed(1)}% fake prob</p>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchResults = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getResults(20)
      setResults(data.results || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchResults() }, [])

  const total = results.length
  const manipulated = results.filter(r => r.verdict?.is_manipulated).length
  const authentic = total - manipulated
  const avgConf = total
    ? (results.reduce((s, r) => s + (r.verdict?.confidence || 0), 0) / total).toFixed(2)
    : '—'
  const avgTime = total
    ? (results.reduce((s, r) => s + (r.processing_time_seconds || 0), 0) / total).toFixed(2) + 's'
    : '—'

  const chartData = results.slice(0, 10).reverse().map((r, i) => ({
    name: `#${i + 1}`,
    value: r.verdict?.fake_probability || 0,
    fake: r.verdict?.is_manipulated,
  }))

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Detection History</h1>
            <p className="text-veritas-muted text-sm mt-1">All analyses from this session</p>
          </div>
          <button onClick={fetchResults} className="btn-secondary text-sm py-2">
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading history..." />
        ) : error ? (
          <div className="card p-6 text-center">
            <p className="text-veritas-danger">{error}</p>
            <button onClick={fetchResults} className="btn-primary mt-4 mx-auto">Retry</button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Analyzed" value={total} sub="this session" />
              <StatCard
                label="Manipulated"
                value={manipulated}
                sub={`${total ? Math.round(manipulated / total * 100) : 0}% of total`}
                color="text-veritas-danger"
              />
              <StatCard label="Avg Confidence" value={avgConf} color="text-veritas-accent" />
              <StatCard label="Avg Process Time" value={avgTime} />
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-5">
                  <ChartBarIcon className="w-4 h-4 text-veritas-accent" />
                  <h3 className="font-display font-semibold text-veritas-text">
                    Fake Probability — Last {chartData.length} analyses
                  </h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.fake ? '#ef4444' : '#22c55e'}
                          opacity={0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 text-xs text-veritas-muted">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-veritas-success inline-block" /> Authentic</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-veritas-danger inline-block" /> Manipulated</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-1 bg-veritas-border inline-block" /> 0.5 threshold</span>
                </div>
              </div>
            )}

            {/* Result list */}
            <div className="space-y-3">
              <h3 className="font-display font-semibold text-veritas-text">Recent Results</h3>

              {results.length === 0 ? (
                <div className="card p-12 text-center">
                  <ShieldCheckIcon className="w-12 h-12 text-veritas-muted/40 mx-auto mb-3" />
                  <p className="text-veritas-muted">No analyses yet.</p>
                  <Link to="/" className="btn-primary mt-4 inline-flex mx-auto">
                    Start Detection
                  </Link>
                </div>
              ) : (
                results.map((r) => {
                  const fake = r.verdict?.is_manipulated
                  return (
                    <Link
                      key={r.request_id}
                      to={`/result/${r.request_id}`}
                      className="card p-4 flex items-center gap-4 hover:border-veritas-accent/40 transition-all group"
                    >
                      {fake ? (
                        <ShieldExclamationIcon className="w-8 h-8 text-veritas-danger flex-shrink-0" />
                      ) : (
                        <ShieldCheckIcon className="w-8 h-8 text-veritas-success flex-shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                            fake
                              ? 'bg-veritas-danger/15 text-veritas-danger'
                              : 'bg-veritas-success/15 text-veritas-success'
                          }`}>
                            {fake ? 'MANIPULATED' : 'AUTHENTIC'}
                          </span>
                          <span className="label">{r.media_type?.toUpperCase()}</span>
                        </div>
                        <p className="text-veritas-muted font-mono text-xs truncate">
                          {r.request_id}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className={`font-bold font-mono ${fake ? 'text-veritas-danger' : 'text-veritas-success'}`}>
                          {Math.round((r.verdict?.confidence || 0) * 100)}%
                        </p>
                        <div className="flex items-center gap-1 text-veritas-muted text-xs justify-end">
                          <ClockIcon className="w-3 h-3" />
                          {r.processing_time_seconds?.toFixed(1)}s
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
