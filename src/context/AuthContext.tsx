import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { firebaseAuth, firebaseReady, firestore } from '../lib/firebase'

interface AuthState {
  user: { id: string; email: string | null; name: string | null } | null
  isReady: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState['user']>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!firebaseReady || !firebaseAuth) {
      setIsReady(true)
      return
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (current) => {
      if (current) {
        setUser({
          id: current.uid,
          email: current.email,
          name: current.displayName ?? current.email?.split('@')[0] ?? null,
        })
      } else {
        setUser(null)
      }
      setIsReady(true)
    })

    return () => unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    if (!firebaseAuth || !firestore) {
      throw new Error('Firebase is not configured.')
    }
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password,
    )
    await updateProfile(credential.user, { displayName: name })
    await setDoc(doc(firestore, 'users', credential.user.uid), {
      email,
      name,
      created_at: serverTimestamp(),
    })
  }

  const signIn = async (email: string, password: string) => {
    if (!firebaseAuth) {
      throw new Error('Firebase is not configured.')
    }
    await signInWithEmailAndPassword(firebaseAuth, email, password)
  }

  const signOutUser = async () => {
    if (!firebaseAuth) return
    await signOut(firebaseAuth)
  }

  const value = useMemo(
    () => ({
      user,
      isReady,
      signIn,
      signUp,
      signOutUser,
    }),
    [user, isReady],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
