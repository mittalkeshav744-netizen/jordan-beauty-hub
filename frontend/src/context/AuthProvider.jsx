import { useCallback, useEffect, useMemo, useState } from 'react'

import { authService } from '../services/authService'
import { AuthContext } from './contexts'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    let isActive = true
    authService
      .getCurrentUser()
      .then((currentUser) => isActive && setUser(currentUser))
      .catch(() => isActive && setUser(null))
      .finally(() => isActive && setIsCheckingSession(false))
    return () => {
      isActive = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const loggedInUser = await authService.login(credentials)
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const register = useCallback(async (data) => {
    const newUser = await authService.register(data)
    setUser(newUser)
    return newUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const updateProfile = useCallback(async (data) => {
    const updatedUser = await authService.updateProfile(data)
    setUser(updatedUser)
    return updatedUser
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isCheckingSession,
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, isCheckingSession, login, register, logout, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
