"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  Shield,
  ChevronDown,
  Hash,
  Globe,
  Plus,
  X,
  Menu,
  LogIn,
  MessageCircle,
} from "lucide-react";

interface ChatMsg {
  id: string;
  content: string;
  createdAt: string;
  roomId: string | null;
  user: { id: string; username: string; role: string };
}

interface ChatRoom {
  id: string;
  name: string;
  _count: { messages: number; members: number };
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [createError, setCreateError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Join room
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [joinRoomName, setJoinRoomName] = useState("");
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIdsRef = useRef(new Set<string>());
  const shouldScrollRef = useRef(true);
  const optimisticIdRef = useRef(0);

  const isGuest = status === "unauthenticated";
  const isAuth = status === "authenticated";

  // Load joined rooms
  useEffect(() => {
    if (!isAuth) return;
    fetchRooms();
  }, [isAuth]);

  async function fetchRooms() {
    try {
      const res = await fetch("/api/chat/rooms");
      const data = await res.json();
      if (data.rooms) setRooms(data.rooms);
    } catch {}
  }

  // Load initial messages when room changes
  useEffect(() => {
    if (!isAuth) return;
    setLoading(true);
    seenIdsRef.current.clear();
    setMessages([]);
    shouldScrollRef.current = true;
    (async () => {
      try {
        const url = activeRoom
          ? `/api/chat?limit=50&roomId=${activeRoom}`
          : "/api/chat?limit=50";
        const res = await fetch(url);
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
          data.messages.forEach((m: ChatMsg) => seenIdsRef.current.add(m.id));
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [isAuth, activeRoom]);

  // SSE for real-time messages
  useEffect(() => {
    if (!isAuth) return;

    function connect() {
      const url = activeRoom
        ? `/api/chat/stream?roomId=${activeRoom}`
        : "/api/chat/stream";
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const msg: ChatMsg = JSON.parse(event.data);
          if (seenIdsRef.current.has(msg.id)) return;
          seenIdsRef.current.add(msg.id);
          setMessages((prev) => {
            // Replace optimistic message from same user with same content
            const optIdx = prev.findIndex(
              (m) => m.id.startsWith("optimistic-") && m.user.id === msg.user.id && m.content === msg.content
            );
            if (optIdx !== -1) {
              const next = [...prev];
              next[optIdx] = msg;
              return next;
            }
            return [...prev, msg];
          });
        } catch {}
      };

      es.onerror = () => {
        es.close();
        reconnectRef.current = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      esRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [isAuth, activeRoom]);

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (shouldScrollRef.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        shouldScrollRef.current = false;
      });
      return;
    }
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
    }
  }, [messages, loading]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending || !session) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    // Optimistic message — appears instantly in gray
    const optimisticId = `optimistic-${++optimisticIdRef.current}`;
    const optimisticMsg: ChatMsg = {
      id: optimisticId,
      content,
      createdAt: new Date().toISOString(),
      roomId: activeRoom,
      user: { id: session.user.id, username: (session.user as { username?: string }).username || "You", role: (session.user as { role?: string }).role || "USER" },
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const body: { content: string; roomId?: string } = { content };
      if (activeRoom) body.roomId = activeRoom;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setSending(false);
    }
  }

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreatingRoom(true);
    setCreateError("");
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create room");
        return;
      }
      setNewRoomName("");
      setShowCreateRoom(false);
      await fetchRooms();
      setActiveRoom(data.room.id);
    } catch {
      setCreateError("Network error");
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!joinRoomName.trim()) return;
    setJoiningRoom(true);
    setJoinError("");
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: joinRoomName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || "Room not found");
        return;
      }
      setJoinRoomName("");
      setShowJoinRoom(false);
      await fetchRooms();
      if (data.roomId) setActiveRoom(data.roomId);
    } catch {
      setJoinError("Network error");
    } finally {
      setJoiningRoom(false);
    }
  }

  function switchRoom(roomId: string | null) {
    setActiveRoom(roomId);
    setSidebarOpen(false);
  }

  function scrollToBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }

  const activeRoomName = activeRoom
    ? rooms.find((r) => r.id === activeRoom)?.name ?? "Room"
    : "Global";

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Guest view — prompt to login
  if (isGuest) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600/20">
            <MessageCircle className="h-7 w-7 text-accent-400" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-white">Community Chat</h1>
          <p className="mb-6 text-sm text-zinc-500">
            You need an account to access the chat. Sign in or create an account to start chatting!
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push("/login")}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-500"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
            <button
              onClick={() => router.push("/register")}
              className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:text-white"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-5xl px-4 py-4 gap-3">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-20 left-3 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 shadow-lg md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Room sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-30 w-64 border-r border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm transition-transform md:relative md:inset-auto md:z-auto md:w-56 md:translate-x-0 md:rounded-2xl md:border md:bg-zinc-900/50 flex flex-col`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3 md:border-none">
          <h2 className="text-sm font-semibold text-zinc-300">Your Rooms</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-zinc-500 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {/* Global */}
          <button
            onClick={() => switchRoom(null)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              activeRoom === null
                ? "bg-accent-600/20 text-accent-400"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            }`}
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span className="truncate">Global</span>
          </button>

          {/* Joined rooms */}
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => switchRoom(room.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                activeRoom === room.id
                  ? "bg-accent-600/20 text-accent-400"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <Hash className="h-4 w-4 shrink-0" />
              <span className="truncate">{room.name}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="border-t border-zinc-800/60 p-2 space-y-1.5">
          {showCreateRoom ? (
            <form onSubmit={handleCreateRoom} className="space-y-2">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name..."
                maxLength={30}
                autoFocus
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-accent-500/50"
              />
              {createError && (
                <p className="text-xs text-red-400">{createError}</p>
              )}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateRoom(false);
                    setCreateError("");
                  }}
                  className="flex-1 rounded-lg border border-zinc-800 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingRoom || !newRoomName.trim()}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent-600 py-1.5 text-xs font-medium text-white hover:bg-accent-500 disabled:opacity-40"
                >
                  {creatingRoom ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          ) : showJoinRoom ? (
            <form onSubmit={handleJoinRoom} className="space-y-2">
              <input
                type="text"
                value={joinRoomName}
                onChange={(e) => setJoinRoomName(e.target.value)}
                placeholder="Enter room name..."
                maxLength={30}
                autoFocus
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-accent-500/50"
              />
              {joinError && (
                <p className="text-xs text-red-400">{joinError}</p>
              )}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinRoom(false);
                    setJoinError("");
                  }}
                  className="flex-1 rounded-lg border border-zinc-800 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joiningRoom || !joinRoomName.trim()}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
                >
                  {joiningRoom ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Join"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-800 py-2 text-xs text-zinc-500 transition hover:border-accent-500/40 hover:text-accent-400"
              >
                <Plus className="h-3.5 w-3.5" /> Create Room
              </button>
              <button
                onClick={() => setShowJoinRoom(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-800 py-2 text-xs text-zinc-500 transition hover:border-blue-500/40 hover:text-blue-400"
              >
                <LogIn className="h-3.5 w-3.5" /> Join Room
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-600/20">
            {activeRoom ? (
              <Hash className="h-5 w-5 text-accent-400" />
            ) : (
              <Globe className="h-5 w-5 text-accent-400" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{activeRoomName}</h1>
            <p className="text-xs text-zinc-500">
              {activeRoom
                ? "Room chat"
                : "Chat with everyone in real time"}
            </p>
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-600">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {messages.map((msg, i) => {
                const isMe = msg.user.id === session.user.id;
                const isAdmin = msg.user.role === "ADMIN";
                const isOptimistic = msg.id.startsWith("optimistic-");
                const showAvatar =
                  i === 0 || messages[i - 1].user.id !== msg.user.id;
                return (
                  <div
                    key={msg.id}
                    className={`${showAvatar ? "mt-3 first:mt-0" : ""} ${isOptimistic ? "opacity-50" : ""}`}
                  >
                    {showAvatar && (
                      <div className="mb-0.5 flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            isAdmin
                              ? "text-red-400"
                              : isMe
                              ? "text-accent-400"
                              : "text-zinc-300"
                          }`}
                        >
                          {msg.user.username}
                        </span>
                        {isAdmin && (
                          <Shield className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className="text-[10px] text-zinc-600">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                    <p className={`pl-0 text-sm leading-relaxed break-words ${isOptimistic ? "text-zinc-500" : "text-zinc-300"}`}>
                      {msg.content}
                    </p>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}

          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 shadow-lg transition hover:bg-zinc-700 hover:text-white"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="mt-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${activeRoomName}...`}
            maxLength={500}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-500 disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
