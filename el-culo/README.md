# 🃏 El Culo — Juego de cartas multijugador online

Juego de cartas tipo "Presidente" / "El Culo" con partidas online en tiempo real para 3-5 jugadores.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Zustand |
| Backend | Node.js + Express + Socket.io |
| Base de datos | PostgreSQL 16 |
| Auth | JWT |
| Tiempo real | WebSockets (Socket.io) |
| Contenedores | Docker + Docker Compose |

---

## Ejecución rápida (local)

### Prerrequisitos
- Node.js 20+
- PostgreSQL 16+ (o Docker)

### 1. Clonar y configurar
```bash
git clone <repo>
cd el-culo

# Configurar backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus datos de PostgreSQL y JWT_SECRET
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Crear la base de datos
```bash
createdb el_culo
npm run migrate
```

### 4. Arrancar en desarrollo
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

---

## Con Docker Compose (recomendado)

```bash
# Primera vez
docker compose up --build

# Siguientes veces
docker compose up

# Con variables de entorno
JWT_SECRET=mi_secreto_seguro FRONTEND_URL=https://midominio.com docker compose up -d
```

El juego estará disponible en `http://localhost`.

---

## Variables de entorno

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://user:pass@host:5432/el_culo
JWT_SECRET=string_largo_y_aleatorio
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend
```
VITE_WS_URL=http://localhost:3001
```

---

## Tests
```bash
npm test --workspace=backend
```

---

## Estructura del proyecto
```
el-culo/
├── backend/
│   ├── src/
│   │   ├── game/
│   │   │   ├── engine.js        # Lógica pura de cartas y validaciones
│   │   │   └── gameManager.js   # Estado de partidas en memoria
│   │   ├── socket/
│   │   │   └── socketHandler.js # Todos los eventos WebSocket
│   │   ├── routes/
│   │   │   ├── auth.js          # Login, registro, invitado
│   │   │   └── users.js         # Perfiles y ranking
│   │   ├── middleware/auth.js
│   │   ├── db/
│   │   │   ├── pool.js
│   │   │   └── migrate.js
│   │   └── index.js
│   ├── migrations/001_initial.sql
│   ├── tests/engine.test.js
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── LobbyPage.jsx    # Crear/unirse a salas
│   │   │   ├── RoomPage.jsx     # Sala de espera
│   │   │   └── GamePage.jsx     # Tablero principal
│   │   ├── components/
│   │   │   ├── game/
│   │   │   │   ├── PlayingCard.jsx
│   │   │   │   ├── GameTable.jsx
│   │   │   │   └── PlayerHand.jsx
│   │   │   └── chat/Chat.jsx
│   │   ├── hooks/useSocket.js
│   │   ├── store.js             # Zustand global state
│   │   └── App.jsx
│   └── Dockerfile
└── docker-compose.yml
```

---

## Flujo de una partida

```
Login/Registro
     ↓
   Lobby → Crear sala (código generado) OR Unirse (pegar código)
     ↓
 Sala de espera (todos se marcan como listos)
     ↓
  Anfitrión inicia la partida
     ↓
 Reparto de cartas (52 cartas entre jugadores)
     ↓
 Turno del jugador con 3 de oros (primera vez)
  → Jugar cartas / Pasar
  → AS limpia mesa → el mismo jugador sigue
  → Todos pasan → mesa se limpia → último que jugó empieza
     ↓
 Jugador sin cartas = siguiente posición (Presidente → Viceculo)
     ↓
 Último con cartas = Culo
     ↓
 Intercambio de cartas según roles
     ↓
 El Culo empieza la siguiente ronda
     ↓
 Siguiente ronda → ...
```

---

## Eventos WebSocket

### Cliente → Servidor
| Evento | Payload | Descripción |
|--------|---------|-------------|
| `create_room` | `{maxPlayers, isPublic}` | Crear sala privada |
| `join_room` | `{code}` | Unirse por código |
| `ready` | — | Toggle listo/no listo |
| `start_game` | — | Iniciar (solo anfitrión) |
| `play_card` | `{gameId, cardIds[]}` | Jugar cartas seleccionadas |
| `pass` | `{gameId}` | Pasar turno |
| `confirm_exchange` | `{gameId, cardIds[]}` | Confirmar intercambio |
| `chat_message` | `{content}` | Enviar mensaje de chat |
| `reconnect_room` | `{code}` | Reconectar a sala activa |

### Servidor → Cliente
| Evento | Payload | Descripción |
|--------|---------|-------------|
| `room_created` | `{code, room}` | Sala creada |
| `room_update` | `{room}` | Estado actualizado de sala |
| `game_started` | `{...state, myHand}` | Partida iniciada + mano privada |
| `game_event` | `{event, ...payload}` | Evento de juego (jugada, pase, etc.) |
| `play_result` | `{tableCards, nextPlayer}` | Resultado de jugada |
| `hand_update` | `{hand, phase}` | Mano actualizada (privada) |
| `chat_message` | `{nickname, content, timestamp}` | Mensaje de chat |
| `error` | `{reason}` | Error de validación |

---

## API REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/guest` | Acceso rápido sin contraseña |
| GET | `/api/users/:id/stats` | Estadísticas de usuario |
| GET | `/api/users/ranking` | Top 50 jugadores |
| GET | `/api/health` | Health check |

---

## Despliegue en producción

### Opción A: Railway / Render / Fly.io
1. Crea una base de datos PostgreSQL en el proveedor
2. Deploy del backend con las variables de entorno correctas
3. Deploy del frontend (o sirve el build estático con el backend)

### Opción B: VPS propio
```bash
# En el servidor
git clone <repo> && cd el-culo
JWT_SECRET=$(openssl rand -hex 32) \
FRONTEND_URL=https://tudominio.com \
docker compose -f docker-compose.yml up -d

# Configurar Nginx/Caddy como reverse proxy al puerto 80
```

---

## Portar a React Native (futuro)

1. El backend no cambia nada.
2. En frontend, reemplaza:
   - `react-router-dom` → `@react-navigation/native`
   - componentes HTML → componentes RN (`View`, `Text`, `TouchableOpacity`)
   - `socket.io-client` funciona igual
   - `zustand` funciona igual
3. Las cartas se pueden renderizar con `react-native-svg` o imágenes PNG.

```bash
# Compilar APK
npx react-native build-android --mode=release
```
