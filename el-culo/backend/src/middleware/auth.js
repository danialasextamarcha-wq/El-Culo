const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    req.userId   = payload.userId;
    req.nickname = payload.nickname;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { authMiddleware };
