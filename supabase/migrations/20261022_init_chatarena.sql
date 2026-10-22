-- ChatArena Live Cross-Device Realtime Schema (Supabase Postgres + Realtime + RLS)

CREATE TABLE IF NOT EXISTS public.room_messages (
  id text PRIMARY KEY CHECK (char_length(id) BETWEEN 3 AND 64),
  room text NOT NULL CHECK (room ~ '^[a-z0-9-]{1,24}$'),
  kind text NOT NULL CHECK (kind IN ('chat', 'system', 'ai')),
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 64),
  user_name text NOT NULL CHECK (char_length(user_name) <= 40),
  avatar text NOT NULL DEFAULT '',
  ts bigint NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room_ts
  ON public.room_messages (room, ts DESC);

CREATE TABLE IF NOT EXISTS public.room_games (
  room text PRIMARY KEY CHECK (room ~ '^[a-z0-9-]{1,24}$'),
  v integer NOT NULL DEFAULT 1,
  state jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
ALTER TABLE public.room_games REPLICA IDENTITY FULL;

ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_messages_select" ON public.room_messages
  FOR SELECT TO anon, authenticated
  USING (room ~ '^[a-z0-9-]{1,24}$');

CREATE POLICY "room_messages_insert" ON public.room_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (room ~ '^[a-z0-9-]{1,24}$' AND char_length(id) BETWEEN 3 AND 64);

CREATE POLICY "room_messages_update" ON public.room_messages
  FOR UPDATE TO anon, authenticated
  USING (room ~ '^[a-z0-9-]{1,24}$')
  WITH CHECK (room ~ '^[a-z0-9-]{1,24}$');

CREATE POLICY "room_messages_delete" ON public.room_messages
  FOR DELETE TO anon, authenticated
  USING (room ~ '^[a-z0-9-]{1,24}$');

CREATE POLICY "room_games_select" ON public.room_games
  FOR SELECT TO anon, authenticated
  USING (room ~ '^[a-z0-9-]{1,24}$');

CREATE POLICY "room_games_insert" ON public.room_games
  FOR INSERT TO anon, authenticated
  WITH CHECK (room ~ '^[a-z0-9-]{1,24}$');

CREATE POLICY "room_games_update" ON public.room_games
  FOR UPDATE TO anon, authenticated
  USING (room ~ '^[a-z0-9-]{1,24}$')
  WITH CHECK (room ~ '^[a-z0-9-]{1,24}$');

CREATE POLICY "room_games_delete" ON public.room_games
  FOR DELETE TO anon, authenticated
  USING (room ~ '^[a-z0-9-]{1,24}$');

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_games;

CREATE OR REPLACE FUNCTION public.save_room_game(
  p_room text,
  p_v integer,
  p_state jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result_state jsonb;
BEGIN
  IF p_room !~ '^[a-z0-9-]{1,24}$' THEN
    RAISE EXCEPTION 'Invalid room slug';
  END IF;

  INSERT INTO public.room_games (room, v, state, updated_at)
  VALUES (p_room, p_v, p_state, now())
  ON CONFLICT (room) DO UPDATE
  SET v = EXCLUDED.v,
      state = EXCLUDED.state,
      updated_at = now()
  WHERE public.room_games.state IS NULL
     OR p_state IS NULL
     OR EXCLUDED.v >= public.room_games.v;

  SELECT state INTO result_state
  FROM public.room_games
  WHERE room = p_room;

  RETURN result_state;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_room_game(text, integer, jsonb) TO anon, authenticated;
