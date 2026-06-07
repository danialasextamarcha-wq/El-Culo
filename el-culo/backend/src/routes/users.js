const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:id/stats
router.get('/:id/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.nickname, u.avatar_url, p.stats_presidente, p.stats_culo,
              p.stats_vicepresidente, p.stats_viceculo, p.partidas_jugadas
       FROM users u JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/users/ranking
router.get('/ranking', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nickname, u.avatar_url,
              p.stats_presidente, p.stats_culo, p.partidas_jugadas,
              CASE WHEN p.partidas_jugadas > 0
                   THEN ROUND(p.stats_presidente::numeric / p.partidas_jugadas * 100, 1)
                   ELSE 0 END as winrate
       FROM users u JOIN profiles p ON u.id = p.user_id
       WHERE p.partidas_jugadas > 0
       ORDER BY p.stats_presidente DESC, p.stats_culo ASC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// PATCH /api/users/me/avatar
router.patch('/me/avatar', authMiddleware, async (req, res) => {
  const { avatarUrl } = req.body;
  try {
    await pool.query('UPDATE users SET avatar_url=$1 WHERE id=$2', [avatarUrl, req.userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
