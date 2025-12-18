import React, { useState } from 'react'

interface Props {
  onLoginSuccess: () => void
}

const Login: React.FC<Props> = ({ onLoginSuccess }) => {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      })

      if (!res.ok) {
        throw new Error('Неверный логин или пароль')
      }

      const data = await res.json()
      localStorage.setItem('token', data.token)
      onLoginSuccess()
    } catch (e: any) {
      setError(e.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h2>Вход в систему</h2>

        <input
          placeholder="Логин"
          value={login}
          onChange={e => setLogin(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Пароль"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={styles.input}
        />

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.button} disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>

        <div style={styles.hint}>
          Тестовый доступ: <b>admin / admin</b>
        </div>
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f3f4f6',
    fontFamily: 'system-ui',
  },
  card: {
    background: '#fff',
    padding: 24,
    borderRadius: 12,
    width: 320,
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    padding: 10,
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #ccc',
  },
  button: {
    padding: 10,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    color: '#555',
    marginTop: 8,
    textAlign: 'center',
  },
}

export default Login
