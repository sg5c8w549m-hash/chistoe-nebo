module.exports.authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth) {
    return res.status(401).json({ message: 'Нет токена' })
  }

  const token = auth.replace('Bearer ', '')

  // ⚠️ временно (потом будет JWT)
  if (token === 'dev-token') {
    req.user = {
      id: 'dev-user-1',
      role: 'admin', // 👈 МЕНЯЕМ ТУТ ДЛЯ ПРОВЕРКИ
    }
    return next()
  }

  return res.status(401).json({ message: 'Неверный токен' })
}
