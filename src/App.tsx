import { useEffect, useState } from "react";
import type { User } from "./lib/types";
import {
  getRoomFromUrl,
  isOnline,
  loadMembers,
  loadUser,
  normalizeRoomSlug,
  saveUser,
  setRoomInUrl,
} from "./lib/store";
import JoinScreen from "./components/JoinScreen";
import ChatRoom from "./components/ChatRoom";

const CAP = 20;

export default function App() {
  const [user, setUser] = useState<User | null>(() => loadUser());
  const [room, setRoom] = useState(() => getRoomFromUrl());
  const [joined, setJoined] = useState(false);
  const [full, setFull] = useState(false);

  // Listen to browser back/forward navigation between rooms
  useEffect(() => {
    const onPop = () => setRoom(getRoomFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const handleJoin = (u: User, rawRoom: string) => {
    const r = normalizeRoomSlug(rawRoom);
    const members = loadMembers(r);
    const onlineHumans = members.filter(
      (m) => m.id !== u.id && !m.bot && isOnline(m)
    );
    const alreadyIn = members.some((m) => m.id === u.id);
    if (!alreadyIn && onlineHumans.length >= CAP) {
      setFull(true);
      setRoom(r);
      return;
    }
    saveUser(u);
    setUser(u);
    setRoom(r);
    setFull(false);
    setRoomInUrl(r);
    setJoined(true);
  };

  const handleUpdateUser = (next: User) => {
    saveUser(next);
    setUser(next);
  };

  if (!joined || !user) {
    return (
      <JoinScreen
        initialRoom={room}
        savedUser={user}
        onJoin={handleJoin}
        full={full}
      />
    );
  }

  return (
    <ChatRoom
      me={user}
      room={room}
      onUpdateMe={handleUpdateUser}
      onSwitchRoom={(nextRoom) => {
        const clean = normalizeRoomSlug(nextRoom);
        setRoom(clean);
        setRoomInUrl(clean);
      }}
      onLeave={() => setJoined(false)}
    />
  );
}
