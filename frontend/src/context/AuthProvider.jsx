import { useCallback, useEffect, useMemo, useState } from 'react'

import { authService } from '../services/authService'
import { clearLocalBeautyProfile } from '../utils/beautyProfile'
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
    // Account profile is the only source for personalization; drop any guest quiz cache.
    clearLocalBeautyProfile()
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const register = useCallback(async (data) => {
    const newUser = await authService.register(data)
    const {
      email_verification_required: _required,
      email_verification_sent: _sent,
      ...userFields
    } = newUser
    // New accounts start without personalization until they take the quiz while signed in.
    clearLocalBeautyProfile()
    setUser(userFields)
    return newUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      clearLocalBeautyProfile()
      setUser(null)
    }
  }, [])

  const updateProfile = useCallback(async (data) => {
    const updatedUser = await authService.updateProfile(data)
    setUser(updatedUser)
    return updatedUser
  }, [])

  const saveBeautyProfile = useCallback(async (data) => {
    const updatedUser = await authService.saveBeautyProfile(data)
    setUser(updatedUser)
    return updatedUser
  }, [])

  const applyUser = useCallback((nextUser) => {
    setUser(nextUser)
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
      saveBeautyProfile,
      applyUser,
    }),
    [user, isCheckingSession, login, register, logout, updateProfile, saveBeautyProfile, applyUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
