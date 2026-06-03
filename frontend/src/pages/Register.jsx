import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../context/AuthContext'
import { registerUser } from '../services/api'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const data = await registerUser(form.name, form.email, form.password)
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
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-veritas-muted text-sm mt-1">Start detecting deepfakes with Veritas AI</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-veritas-surface border border-veritas-border rounded-xl p-8 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-veritas-muted mb-1.5">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-veritas-bg border border-veritas-border rounded-lg px-4 py-2.5 text-veritas-text text-sm focus:outline-none focus:border-veritas-accent transition-colors"
              placeholder="Your name"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-veritas-muted mb-1.5">Confirm Password</label>
            <input
              type="password"
              required
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="w-full bg-veritas-bg border border-veritas-border rounded-lg px-4 py-2.5 text-veritas-text text-sm focus:outline-none focus:border-veritas-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-veritas-accent hover:bg-veritas-accent/90 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-veritas-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-veritas-accent hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
