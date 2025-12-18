const jwt = require('jsonwebtoken')

const SECRET = 'CHISTOE_NEBO_SECRET'

function auth(requiredRole = null) {
  return (req, res, next) => {
    const header = req.headers.authorization
    if (!header) return res.status(401).json({ message: 'Нет токена' })

    const token = header.split(' ')[1]

    try {
      const user = jwt.verify(token, SECRET)
      req.user = user

      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({ message: 'Нет прав' })
      }

      next()
    } catch {
      res.status(401).json({ message: 'Неверный токен' })
    }
  }
}

module.exports = { auth, SECRET }
