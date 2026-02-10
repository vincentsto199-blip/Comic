import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { firebaseReady } from '../lib/firebase'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

export function AuthPanel() {
  const { user, signIn, signUp, signOutUser } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showModal) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showModal])

  const openLogin = () => {
    setIsSignUp(false)
    setError(null)
    setEmail('')
    setPassword('')
    setName('')
    setShowModal(true)
  }

  const openSignUp = () => {
    setIsSignUp(true)
    setError(null)
    setEmail('')
    setPassword('')
    setName('')
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setError(null)
    setIsLoading(true)
    try {
      if (isSignUp) {
        if (!name.trim()) {
          throw new Error('Please enter a display name.')
        }
        await signUp(email.trim(), password, name.trim())
      } else {
        await signIn(email.trim(), password)
      }
      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setIsLoading(false)
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-red/20 text-xs font-semibold text-accent-red-hover">
          {(user.name ?? 'U').charAt(0).toUpperCase()}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-white/90">{user.name ?? 'User'}</p>
        </div>
        <Button variant="ghost" onClick={signOutUser} className="text-xs text-white/50 hover:text-white">
          Sign out
        </Button>
      </div>
    )
  }

  if (!firebaseReady) {
    return (
      <p className="text-xs text-white/40">
        Firebase not configured
      </p>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={openLogin} className="text-sm text-white/70 hover:text-white">
          Log in
        </Button>
        <Button variant="primary" onClick={openSignUp} className="text-sm px-5 py-2">
          Sign up
        </Button>
      </div>

      {showModal ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-16 backdrop-blur-sm animate-fade-in-fast"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false)
          }}
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-sm rounded-xl border border-white/[0.08] bg-ink-900 p-6 shadow-2xl shadow-black/40 animate-scale-in"
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <h2 className="text-lg font-semibold text-white mb-1">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-white/40 mb-5">
              {isSignUp ? 'Join the community and share your soundtracks.' : 'Sign in to your Comictracks account.'}
            </p>

            <div className="flex flex-col gap-3">
              {isSignUp ? (
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Display name"
                />
              ) : null}
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
              />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
              />
              {error ? (
                <p className="text-xs text-accent-red font-medium animate-fade-in-fast">{error}</p>
              ) : null}
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full mt-1 py-2.5"
              >
                {isLoading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
              </Button>
            </div>

            <div className="mt-4 text-center">
              <button
                className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                onClick={() => {
                  setIsSignUp((prev) => !prev)
                  setError(null)
                }}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
