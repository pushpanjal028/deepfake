import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('veritas_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = (userData, token) => {
    localStorage.setItem('veritas_user', JSON.stringify(userData))
    localStorage.setItem('veritas_token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('veritas_user')
    localStorage.removeItem('veritas_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
