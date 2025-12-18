import React, { useState } from 'react'
import { api } from '../api'

export default function NewOrderForm() {
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [type, setType] = useState('plastics')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const body = { title: title || `Заявка: ${type}`, type, address, message: msg }
      await api.createOrder(body)
      setResult({ ok: true, message: 'Заявка отправлена' })
      setTitle(''); setAddress(''); setMsg('')
    } catch (err) {
      setResult({ ok: false, message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="new-order">
      <h2>Новая заявка</h2>
      <form onSubmit={submit}>
        <label>Заголовок
          <input value={title} onChange={e => setTitle(e.target.value)} />
        </label>

        <label>Тип отходов
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="paper">Макулатура</option>
            <option value="plastics">Пластик</option>
            <option value="metal">Металл</option>
            <option value="rubber">Резина</option>
            <option value="other">Другое</option>
          </select>
        </label>

        <label>Адрес
          <input value={address} onChange={e => setAddress(e.target.value)} />
        </label>

        <label>Комментарий
          <textarea value={msg} onChange={e => setMsg(e.target.value)} />
        </label>

        <button type="submit" disabled={loading}>{loading ? 'Отправка...' : 'Создать заявку'}</button>
      </form>

      {result && <div className={result.ok ? 'ok' : 'error'}>{result.message}</div>}
    </div>
  )
}
