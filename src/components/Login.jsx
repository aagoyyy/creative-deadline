
import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )
    } catch (err) {
      console.error(err)
      setError(
        err.code === 'auth/invalid-credential'
          ? 'Email atau password salah.'
          : err.code === 'auth/too-many-requests'
            ? 'Terlalu banyak percobaan. Coba lagi nanti.'
            : 'Login gagal. Periksa koneksi dan konfigurasi Firebase.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#101114',
      color: '#f5f5f5',
      fontFamily: 'Arial, sans-serif',
      padding: 24,
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          display: 'grid',
          gap: 16,
          padding: 28,
          border: '1px solid #303238',
          borderRadius: 16,
          background: '#191a1f',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 8px' }}>Creative Workflow</h1>
          <p style={{ color: '#a5a6ad', margin: 0 }}>
            Login ke workspace tim
          </p>
        </div>

        <label style={{ display: 'grid', gap: 8 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            style={inputStyle}
          />
        </label>

        {error && (
          <p role="alert" style={{ color: '#ff8a8a', margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            border: 0,
            borderRadius: 8,
            background: '#a78bfa',
            color: '#17131f',
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Memproses...' : 'Login'}
        </button>
      </form>
    </main>
  )
}

const inputStyle = {
  boxSizing: 'border-box',
  width: '100%',
  padding: 12,
  borderRadius: 8,
  border: '1px solid #41434c',
  background: '#111216',
  color: '#ffffff',
}
