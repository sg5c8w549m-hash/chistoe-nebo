const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText} — ${text}`)
  }
  return res.json()
}

export const api = {
  // получить список заявок (пример: /api/orders)
  getOrders: () => request('/api/orders'),
  // создать заявку
  createOrder: (data) =>
    request('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  // health
  health: () => request('/api/health'),
}
