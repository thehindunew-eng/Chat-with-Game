import type { RealtimeChannel } from "@supabase/supabase-js";
import type { BusEvent, LiveGame, Member, Message, SyncStatus, User } from "./types";
import { supabase } from "./supabase";

interface DbMessageRow {
  id: string;
  room: string;
  kind: Message["kind"];
  user_id: string;
  user_name: string;
  avatar: string;
  ts: number;
  payload: {
    text?: string;
    attachment?: Message["attachment"];
    card?: Message["card"];
    poll?: Message["poll"];
    replyTo?: Message["replyTo"];
    reactions?: Message["reactions"];
    seenBy?: string[];
    editedAt?: number;
  };
}

function rowToMessage(row: DbMessageRow): Message {
  const p = row.payload || {};
  return {
    id: row.id,
    kind: row.kind,
    userId: row.user_id,
    name: row.user_name,
    avatar: row.avatar,
    ts: Number(row.ts),
    text: p.text,
    attachment: p.attachment,
    card: p.card,
    poll: p.poll,
    replyTo: p.replyTo,
    reactions: p.reactions,
    seenBy: p.seenBy,
    editedAt: p.editedAt,
    delivery: "cloud",
  };
}

function messageToRow(room: string, m: Message): DbMessageRow {
  // Keep DB payload fast and well under Postgres row limits
  const safeAttachment =
    m.attachment && m.attachment.url.length > 650_000
      ? { ...m.attachment, url: "", ephemeral: true }
      : m.attachment;

  return {
    id: m.id,
    room,
    kind: m.kind,
    user_id: m.userId,
    user_name: m.name.slice(0, 40),
    avatar: m.avatar,
    ts: m.ts,
    payload: {
      text: m.text,
      attachment: safeAttachment,
      card: m.card,
      poll: m.poll,
      replyTo: m.replyTo,
      reactions: m.reactions,
      seenBy: m.seenBy,
      editedAt: m.editedAt,
    },
  };
}

export interface RoomSyncCallbacks {
  onStatus: (status: SyncStatus) => void;
  onHydrateMessages: (msgs: Message[]) => void;
  onEvent: (event: BusEvent) => void;
  onCloudMembers: (members: Member[]) => void;
}

export class RoomSyncClient {
  private room: string;
  private me: User;
  private cb: RoomSyncCallbacks;
  private bus: BroadcastChannel | null = null;
  private channel: RealtimeChannel | null = null;
  private joinedAt = Date.now();
  private closed = false;

  constructor(room: string, me: User, cb: RoomSyncCallbacks) {
    this.room = room;
    this.me = me;
    this.cb = cb;
  }

  async connect(cutoffTs: number): Promise<void> {
    // 1. Always spin up local BroadcastChannel for instant zero-ms multi-tab sync
    if (typeof BroadcastChannel !== "undefined") {
      const bus = new BroadcastChannel("chatarena_" + this.room);
      bus.onmessage = (ev: MessageEvent<BusEvent>) => {
        if (!this.closed) this.cb.onEvent(ev.data);
      };
      this.bus = bus;
    }

    if (!supabase) {
      this.cb.onStatus("local");
      return;
    }

    this.cb.onStatus("connecting");

    // 2. Subscribe to Supabase Realtime Presence + Broadcast + Postgres Changes
    const ch = supabase.channel(`chatarena-v2:${this.room}`, {
      config: {
        presence: { key: this.me.id },
        broadcast: { self: false, ack: false },
      },
    });

    ch.on("presence", { event: "sync" }, () => {
      if (this.closed) return;
      const state = ch.presenceState<Record<string, any>>();
      const humans: Member[] = [];
      for (const [uid, presences] of Object.entries(state)) {
        const latest = presences[presences.length - 1];
        if (!latest) continue;
        humans.push({
          id: uid,
          name: String(latest.name || "Guest"),
          avatar: String(latest.avatar || ""),
          bio: latest.bio ? String(latest.bio) : undefined,
          device: latest.device === "mobile" ? "mobile" : "desktop",
          joinedAt: Number(latest.joinedAt || Date.now()),
          lastSeen: Date.now(),
          bot: false,
        });
      }
      // Deterministic host election: earliest joined human in the room is Room Host
      humans.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      if (humans.length > 0) humans[0] = { ...humans[0], admin: true };
      this.cb.onCloudMembers(humans);
    });

    ch.on("broadcast", { event: "bus" }, ({ payload }) => {
      if (!this.closed && payload) {
        this.cb.onEvent(payload as BusEvent);
      }
    });

    ch.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "room_messages",
        filter: `room=eq.${this.room}`,
      },
      (change) => {
        if (this.closed) return;
        if (change.eventType === "INSERT" && change.new) {
          this.cb.onEvent({
            t: "msg",
            m: rowToMessage(change.new as DbMessageRow),
          });
        } else if (change.eventType === "UPDATE" && change.new) {
          this.cb.onEvent({
            t: "update",
            m: rowToMessage(change.new as DbMessageRow),
          });
        } else if (change.eventType === "DELETE" && change.old) {
          const oldId = (change.old as { id?: string }).id;
          if (oldId) this.cb.onEvent({ t: "del", id: oldId });
        }
      }
    );

    ch.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "room_games",
        filter: `room=eq.${this.room}`,
      },
      (change) => {
        if (this.closed) return;
        if (change.eventType === "DELETE") {
          this.cb.onEvent({ t: "game", g: null });
          return;
        }
        const row = change.new as { state?: LiveGame | null } | undefined;
        if (row) {
          this.cb.onEvent({ t: "game", g: row.state ?? null });
        }
      }
    );

    ch.subscribe(async (status) => {
      if (this.closed) return;
      if (status === "SUBSCRIBED") {
        this.cb.onStatus("live");
        await ch.track({
          id: this.me.id,
          name: this.me.name,
          avatar: this.me.avatar,
          bio: this.me.bio || "Online",
          device: this.me.device || "desktop",
          joinedAt: this.joinedAt,
        });
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        this.cb.onStatus("local");
      }
    });

    this.channel = ch;

    // 3. Hydrate persisted room history + active live game in parallel
    await this.hydrateFromCloud(cutoffTs);
  }

  private async hydrateFromCloud(cutoffTs: number): Promise<void> {
    if (!supabase || this.closed) return;
    try {
      const [msgRes, gameRes] = await Promise.all([
        supabase
          .from("room_messages")
          .select("*")
          .eq("room", this.room)
          .gte("ts", cutoffTs)
          .order("ts", { ascending: true })
          .limit(250),
        supabase
          .from("room_games")
          .select("v, state")
          .eq("room", this.room)
          .maybeSingle(),
      ]);

      if (!this.closed && msgRes.data) {
        const cloudMsgs = (msgRes.data as DbMessageRow[]).map(rowToMessage);
        this.cb.onHydrateMessages(cloudMsgs);
      }

      if (!this.closed && gameRes.data?.state) {
        const cloudGame = gameRes.data.state as LiveGame;
        // Clear abandoned stale games whose timer expired > 15s ago
        if (cloudGame.endsAt + 15_000 < Date.now()) {
          void this.persistGame(null);
        } else {
          this.cb.onEvent({ t: "game", g: cloudGame });
        }
      }
    } catch {
      // Graceful fallback — local storage remains completely functional
    }
  }

  updateMyPresence(me: User): void {
    this.me = me;
    if (this.channel) {
      void this.channel.track({
        id: me.id,
        name: me.name,
        avatar: me.avatar,
        bio: me.bio || "Online",
        device: me.device || "desktop",
        joinedAt: this.joinedAt,
      });
    }
  }

  emit(event: BusEvent): void {
    this.bus?.postMessage(event);
    if (this.channel) {
      void this.channel.send({
        type: "broadcast",
        event: "bus",
        payload: event,
      });
    }
  }

  async persistMessage(m: Message): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from("room_messages")
        .upsert(messageToRow(this.room, m), { onConflict: "id" });
      return !error;
    } catch {
      return false;
    }
  }

  async deleteMessage(id: string): Promise<void> {
    if (!supabase) return;
    try {
      await supabase
        .from("room_messages")
        .delete()
        .eq("room", this.room)
        .eq("id", id);
    } catch {
      /* ignore */
    }
  }

  async persistGame(g: LiveGame | null): Promise<void> {
    if (!supabase) return;
    try {
      await supabase.rpc("save_room_game", {
        p_room: this.room,
        p_v: g ? g.v : 999999999,
        p_state: g,
      });
    } catch {
      /* ignore */
    }
  }

  disconnect(): void {
    this.closed = true;
    this.bus?.close();
    this.bus = null;
    if (this.channel && supabase) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
