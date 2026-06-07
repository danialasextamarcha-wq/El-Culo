const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nickname, email, password } = req.body;
  if (!nickname || !password) return res.status(400).json({ error: 'Faltan campos' });
  if (nickname.length < 2 || nickname.length > 32)
    return res.status(400).json({ error: 'Nickname: 2-32 caracteres' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users(id, nickname, email, password_hash)
       VALUES($1,$2,$3,$4) RETURNING id, nickname, avatar_url`,
      [uuidv4(), nickname, email || null, hash]
    );
    const user = rows[0];
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Nickname ya en uso' });
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { nickname, password } = req.body;
  if (!nickname || !password) return res.status(400).json({ error: 'Faltan campos' });

  try {
    const { rows } = await pool.query(
      'SELECT id, nickname, password_hash, avatar_url FROM users WHERE nickname=$1',
      [nickname]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Usuario no encontrado' });

    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const user = { id: rows[0].id, nickname: rows[0].nickname, avatar_url: rows[0].avatar_url };
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/auth/guest (registro rápido sin contraseña)
router.post('/guest', async (req, res) => {
  const { nickname } = req.body;
  if (!nickname) return res.status(400).json({ error: 'Falta el nickname' });

  try {
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO users(id, nickname) VALUES($1,$2) RETURNING id, nickname`,
      [id, nickname.substring(0, 32)]
    );
    const user = rows[0];
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    if (err.code === '23505') {
      // Nickname ocupado, añadir sufijo
      const nick = `${nickname.substring(0, 28)}_${Math.floor(Math.random()*100)}`;
      const id = uuidv4();
      const { rows } = await pool.query(
        `INSERT INTO users(id, nickname) VALUES($1,$2) RETURNING id, nickname`,
        [id, nick]
      );
      const user = rows[0];
      const token = signToken(user);
      return res.json({ token, user });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

function signToken(user) {
  return jwt.sign(
    { userId: user.id, nickname: user.nickname },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = router;
