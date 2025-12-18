import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function OrdersList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await api.getOrders()
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="orders">
      <h2>Список заявок</h2>
      <button onClick={load}>Обновить</button>
      {loading && <div>Загрузка...</div>}
      {err && <div className="error">Ошибка: {err}</div>}
      {!loading && !err && (
        <ul>
          {orders.length === 0 && <li>Заявок нет</li>}
          {orders.map((o) => (
            <li key={o._id || o.id || JSON.stringify(o)}>
              <strong>{o.title || o.type || 'Заявка'}</strong>
              <div>{o.address || o.message || ''}</div>
              <small>Статус: {o.status || 'новая'}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
