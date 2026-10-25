import { useCallback, useEffect, useState } from "react";
import JoinScreen from "./components/JoinScreen";
import ChatRoom from "./components/ChatRoom";
import type { User } from "./lib/types";
import { loadPlayerStats } from "./lib/ranks";
import {
  getRoomFromUrl,
  loadUser,
  normalizeRoomSlug,
  saveUser,
  setRoomInUrl,
} from "./lib/store";

export default function App() {
  const [savedUser, setSavedUser] = useState<User | null>(() => loadUser());
  const [session, setSession] = useState<{ user: User; room: string } | null>(
    () => {
      try {
        const existing = loadUser();
        const urlRoom = getRoomFromUrl();
        const hasExplicitRoom =
          window.location.pathname !== "/" ||
          Boolean(new URLSearchParams(window.location.search).get("room")) ||
          Boolean(window.location.hash.replace(/^#/, "").trim());
        if (existing && hasExplicitRoom) {
          const stats = loadPlayerStats();
          return {
            user: {
              ...existing,
              elo: stats.elo,
              wins: stats.wins,
              streak: stats.streak,
            },
            room: urlRoom,
          };
        }
      } catch {
        /* ignore */
      }
      return null;
    }
  );

  useEffect(() => {
    const onPop = () => {
      const next = getRoomFromUrl();
      if (session && next !== session.room) {
        setSession({ ...session, room: next });
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [session]);

  const handleJoin = (user: User, rawRoom: string) => {
    const room = normalizeRoomSlug(rawRoom);
    saveUser(user);
    setSavedUser(user);
    setRoomInUrl(room);
    setSession({ user, room });
  };

  const handleUserUpdate = useCallback((patch: Partial<User>) => {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev.user, ...patch };
      saveUser(updated);
      setSavedUser(updated);
      return { ...prev, user: updated };
    });
  }, []);

  const handleLeave = () => {
    try {
      window.history.replaceState({}, "", "/");
    } catch {
      /* ignore */
    }
    setSession(null);
  };

  if (!session) {
    return (
      <JoinScreen
        initialRoom={getRoomFromUrl()}
        savedUser={savedUser}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <ChatRoom
      key={session.room}
      me={session.user}
      room={session.room}
      onUserUpdate={handleUserUpdate}
      onLeave={handleLeave}
    />
  );
}
