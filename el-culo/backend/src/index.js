require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes   = require('./routes/auth');
const usersRoutes  = require('./routes/users');
const socketHandler = require('./socket/socketHandler');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

app.use(cors({ origin: '*' }));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true });
app.use('/api/', limiter);

app.use('/api/auth',  authRoutes);
app.use('/api/users', usersRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

socketHandler(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`El Culo backend running on :${PORT}`);
});

module.exports = { app, io };
