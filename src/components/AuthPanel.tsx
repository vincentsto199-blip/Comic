import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { firebaseReady } from '../lib/firebase'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card } from './ui/Card'

export function AuthPanel() {
  const { user, signIn, signUp, signOutUser } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setIsLoading(false)
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold">{user.name ?? 'User'}</p>
          <p className="text-xs text-white/50">{user.email}</p>
        </div>
        <Button onClick={signOutUser}>Sign out</Button>
      </div>
    )
  }

  if (!firebaseReady) {
    return (
      <Card className="flex w-full flex-col gap-2 p-4 text-xs text-white/60 md:w-96">
        Firebase is not configured. Add your Firebase keys in `.env.local`.
      </Card>
    )
  }

  return (
    <Card className="flex w-full flex-col gap-3 p-4 md:w-96">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {isSignUp ? 'Create an account' : 'Sign in'}
        </p>
        <button
          className="text-xs text-white/60 hover:text-white"
          onClick={() => setIsSignUp((prev) => !prev)}
        >
          {isSignUp ? 'Have an account?' : 'New here?'}
        </button>
      </div>
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
      />
      {error ? <p className="text-xs text-red-200">{error}</p> : null}
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
      </Button>
    </Card>
  )
}
