import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
          ? 'Incorrect email or password.'
          : err.code === 'auth/too-many-requests'
            ? 'Too many attempts. Please try again later.'
            : 'Unable to sign in. Check your connection and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      {/* LEFT: BRANDING */}
      <section className="login-brand">
        <div className="login-brand-content">
          <a href="/" className="login-logo">
            <span className="login-logo-mark">C</span>

            <span className="login-logo-text">
              <strong>Creative</strong>
              <small>WORKFLOW</small>
            </span>
          </a>

          <div className="login-intro">
            <span className="login-eyebrow">
              CREATIVE TEAM WORKSPACE
            </span>

            <h1>
              Good work starts
              <br />
              with <span>great teamwork.</span>
            </h1>

          </div>

          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="3.5"
                    y="4"
                    width="17"
                    height="16"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M8 8h8M8 12h5M8 16h3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <div>
                <strong>Task management</strong>
                <span>Keep every task organized.</span>
              </div>
            </div>

            <div className="login-feature">
              <span className="login-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 19V12M10 19V5M16 19v-9M22 19V8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <div>
                <strong>Team performance</strong>
                <span>Track progress and meet every deadline.</span>
              </div>
            </div>
          </div>
        </div>

        <span className="login-brand-footer">
          CREATIVE WORKFLOW © 2026
        </span>
      </section>

      {/* RIGHT: LOGIN FORM */}
      <section className="login-form-section">
        <div className="login-form-wrapper">
          <div className="login-mobile-logo">
            <span className="login-logo-mark">C</span>
            <strong>Creative Workflow</strong>
          </div>

          <div className="login-heading">
            <span className="login-welcome">WELCOME BACK</span>
            <h2>Login to your account</h2>
            <p>
            Sign in to continue to your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-field">
              <span>Email address</span>

              <input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </label>

            <label className="login-field">
              <span>Password</span>

              <div className="login-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? 'Sembunyikan password'
                      : 'Tampilkan password'
                  }
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                      <path
                        d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a15 15 0 01-3 3.8M6.2 6.2C4.1 7.6 3 12 3 12s3.5 7 9 7c1.1 0 2.1-.3 3-.7"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className="login-security">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="5"
                y="10"
                width="14"
                height="11"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M8 10V7a4 4 0 018 0v3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>

            Secure access to your workspace
          </div>
        </div>

        <span className="login-mobile-footer">
          CREATIVE WORKFLOW © 2026
        </span>
      </section>
    </main>
  )
}