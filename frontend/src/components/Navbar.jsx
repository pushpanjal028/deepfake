import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import { ChartBarIcon, HomeIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const navLinks = [
    { to: '/', label: 'Detect', icon: HomeIcon },
    { to: '/dashboard', label: 'Dashboard', icon: ChartBarIcon },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="border-b border-veritas-border bg-veritas-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <ShieldCheckIcon className="w-8 h-8 text-veritas-accent group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-veritas-accent/20 blur-md rounded-full group-hover:bg-veritas-accent/30 transition-colors" />
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight text-white">
                Veritas
              </span>
              <span className="font-display font-bold text-lg text-veritas-accent ml-0.5">AI</span>
            </div>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === to
                    ? 'bg-veritas-accent/15 text-veritas-accent'
                    : 'text-veritas-muted hover:text-veritas-text hover:bg-veritas-border/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:block">{label}</span>
              </Link>
            ))}
          </div>

          {/* Auth section */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm text-veritas-muted">
                  <UserCircleIcon className="w-4 h-4" />
                  <span>{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-veritas-muted hover:text-veritas-text hover:bg-veritas-border/50 transition-all"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  <span className="hidden sm:block">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-veritas-muted hover:text-veritas-text transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium bg-veritas-accent hover:bg-veritas-accent/90 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
