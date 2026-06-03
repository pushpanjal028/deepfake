import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { loginUser } from '../services/api'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await loginUser(form.email, form.password)
      login(data.user, data.token)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <ShieldCheckIcon className="w-12 h-12 text-veritas-accent mb-3" />
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-veritas-muted text-sm mt-1">Sign in to your Veritas AI account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-veritas-surface border border-veritas-border rounded-xl p-8 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-veritas-muted mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-veritas-bg border border-veritas-border rounded-lg px-4 py-2.5 text-veritas-text text-sm focus:outline-none focus:border-veritas-accent transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-veritas-muted mb-1.5">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-veritas-bg border border-veritas-border rounded-lg px-4 py-2.5 text-veritas-text text-sm focus:outline-none focus:border-veritas-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-veritas-accent hover:bg-veritas-accent/90 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-veritas-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-veritas-accent hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
