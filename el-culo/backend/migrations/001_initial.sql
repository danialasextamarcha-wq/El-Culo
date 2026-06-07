-- Migration 001: Initial schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  avatar_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles / stats
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stats_presidente INT NOT NULL DEFAULT 0,
  stats_culo INT NOT NULL DEFAULT 0,
  stats_vicepresidente INT NOT NULL DEFAULT 0,
  stats_viceculo INT NOT NULL DEFAULT 0,
  partidas_jugadas INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code CHAR(6) NOT NULL UNIQUE,
  host_id UUID REFERENCES users(id),
  max_players INT NOT NULL DEFAULT 4 CHECK (max_players BETWEEN 3 AND 5),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','playing','finished')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  custom_rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Room players
CREATE TABLE IF NOT EXISTS room_players (
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  position INT,
  ready BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- Games
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  winner_id UUID REFERENCES users(id),
  player_count INT NOT NULL,
  final_positions JSONB DEFAULT '[]',
  log JSONB DEFAULT '[]'
);

-- Game state (for reconnection)
CREATE TABLE IF NOT EXISTS game_state (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game results per player
CREATE TABLE IF NOT EXISTS game_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  position INT NOT NULL,
  role VARCHAR(20) NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  nickname VARCHAR(32) NOT NULL,
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_game_results_user ON game_results(user_id);
CREATE INDEX idx_chat_room ON chat_messages(room_id, created_at);

-- Auto-create profile on user creation
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles(user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();
