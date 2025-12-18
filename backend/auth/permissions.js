const rolePermissions = {
  admin: [
    'orders.read',
    'orders.create',
    'orders.export',
    'orders.pdf',
  ],
  manager: [
    'orders.read',
    'orders.pdf',
  ],
}

module.exports.hasPermission = (permission) => {
  return (req, res, next) => {
    const role = req.user?.role
    if (!role) {
      return res.status(403).json({ message: 'Нет роли' })
    }

    if (!rolePermissions[role]?.includes(permission)) {
      return res.status(403).json({ message: 'Нет прав' })
    }

    next()
  }
}
