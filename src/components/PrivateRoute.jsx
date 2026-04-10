import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { Navigate } from 'react-router-dom'

export default function PrivateRoute({ children }) {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    if (!auth) {
      setUser(null)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u))
    return unsubscribe
  }, [])

  if (user === undefined) return null
  if (!user) return <Navigate to="/login" />
  return children
}
