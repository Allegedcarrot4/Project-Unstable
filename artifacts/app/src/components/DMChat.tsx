import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare, UserPlus, Search, User, Menu, X } from "lucide-react";
import { supabase } from "../supabase";
import type { User as AuthUser } from "@supabase/supabase-js";

interface ExtendedProfile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface DMConversation {
  id: string;
  participants: string[];
  created_at: string;
  updated_at: string;
  last_message?: {
    content: string;
    created_at: string;
    user_id: string;
  };
}

interface DMMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "blocked";
  requested_by: string;
  created_at: string;
}

export function DMChat({
  user,
  profile,
}: {
  user: AuthUser | null;
  profile: ExtendedProfile | null;
}) {
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ExtendedProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [usernameCache, setUsernameCache] = useState<Record<string, string>>({});
  const scrollerRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!user || !profile) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0d0d",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <p style={{ color: "rgba(255,255,255,0.3)" }}>Sign in to use DM</p>
      </motion.div>
    );
  }

  const currentUser = user!;
  const currentProfile = profile!;

  // Resolve usernames for conversation participants
  useEffect(() => {
    if (!conversations.length) return;
    let cancelled = false;
    const uncached = conversations
      .map(c => c.participants.find(p => p !== currentUser.id))
      .filter((id): id is string => Boolean(id))
      .filter(id => !usernameCache[id]);

    if (!uncached.length) return;

    async function resolve() {
      for (const id of uncached) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", id)
            .single();
          if (!cancelled && data?.username) {
            setUsernameCache(prev => ({ ...prev, [id]: data.username }));
          }
        } catch { /* ignore */ }
      }
    }
    void resolve();
    return () => { cancelled = true; };
  }, [conversations, currentUser.id, usernameCache]);

  // Load conversations
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadConversations() {
      try {
        const { data, error } = await supabase
          .from("dm_conversations")
          .select("*")
          .contains("participants", [currentUser.id])
          .order("updated_at", { ascending: false });

        if (error) throw error;
        if (!cancelled) {
          setConversations(data || []);
          const totalUnread = data ? Math.max(0, data.length - (activeConversationId ? 1 : 0)) : 0;
          localStorage.setItem(`unstable_dm_unread_total_${currentUser.id}`, String(totalUnread));
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      }
    }
    loadConversations();

    // Subscribe to real-time conversation updates
    channel = supabase
      .channel(`dm_conversations:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_conversations",
          filter: `participants=cs.{${currentUser.id}}`,
        },
        (payload) => {
          if (!cancelled && payload.new) {
            setConversations((prev) => {
              const exists = prev.some((c) => c.id === payload.new.id);
              if (exists) return prev;
              return [payload.new as DMConversation, ...prev];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dm_conversations",
          filter: `participants=cs.{${currentUser.id}}`,
        },
        (payload) => {
          if (!cancelled && payload.new) {
            setConversations((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as DMConversation) : c))
            );
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser.id]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadMessages() {
      try {
        const { data, error } = await supabase
          .from("dm_messages")
          .select("*")
          .eq("conversation_id", activeConversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!cancelled) setMessages(data || []);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }

    loadMessages();

    // Subscribe to real-time message updates
    channel = supabase
      .channel(`dm_messages:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          if (!cancelled && payload.new) {
            setMessages((prev) => [...prev, payload.new as DMMessage]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          if (!cancelled && payload.new) {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as DMMessage) : m))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          if (!cancelled && payload.old) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeConversationId]);

  // Auto-scroll to newest message
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load friendships
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadFriendships() {
      try {
        const { data, error } = await supabase
          .from("friendships")
          .select("*")
          .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);

        if (error) throw error;
        if (!cancelled) setFriendships(data || []);
      } catch (err) {
        console.error("Failed to load friendships:", err);
      }
    }
    loadFriendships();

    // Subscribe to real-time friendship updates
    channel = supabase
      .channel(`friendships:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (!cancelled && payload.new) {
            setFriendships((prev) => {
              const exists = prev.some((f) => f.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as Friendship];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (!cancelled && payload.new) {
            setFriendships((prev) =>
              prev.map((f) => (f.id === payload.new.id ? (payload.new as Friendship) : f))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (!cancelled && payload.old) {
            setFriendships((prev) => prev.filter((f) => f.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser.id]);

  // Search for users
  async function searchUsers(query?: string) {
    const q = (query ?? searchQuery).trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const escapedQ = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${escapedQ}%`)
        .neq("id", currentUser.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  }

  // Add friend / send friend request
  async function sendFriendRequest(friendId: string) {
    try {
      const { error } = await supabase
        .from("friendships")
        .insert({
          user_id: currentUser.id,
          friend_id: friendId,
          status: "pending",
          requested_by: currentUser.id,
        });

      if (error) throw error;
      // Reload friendships
      const { data } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);
      setFriendships(data || []);
    } catch (err) {
      console.error("Failed to send friend request:", err);
    }
  }

  // Accept friend request
  async function acceptFriendRequest(friendshipId: string) {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;
      // Reload friendships
      const { data } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);
      setFriendships(data || []);
    } catch (err) {
      console.error("Failed to accept friend request:", err);
    }
  }

  // Start or open conversation
  async function openOrCreateConversation(otherId: string) {
    try {
      // Check if conversation exists
      const existing = conversations.find((c) =>
        c.participants.includes(currentUser.id) && c.participants.includes(otherId)
      );

      if (existing) {
        setActiveConversationId(existing.id);
        setShowSearch(false);
        return;
      }

      // Create new conversation
      const { data, error } = await supabase
        .from("dm_conversations")
        .insert({
          participants: [currentUser.id, otherId],
        })
        .select()
        .single();

      if (error) throw error;
      setConversations((prev) => [data, ...prev]);
      setActiveConversationId(data.id);
      setShowSearch(false);
    } catch (err) {
      console.error("Failed to open conversation:", err);
    }
  }

  // Send message
  async function sendMessage() {
    if (!input.trim() || !activeConversationId) return;

    const content = input.trim();
    const optimisticMsg: DMMessage = {
      id: crypto.randomUUID(),
      conversation_id: activeConversationId,
      user_id: currentUser.id,
      content,
      created_at: new Date().toISOString(),
    };
    setInput("");
    setMessages((prev) => [...prev, optimisticMsg]);
    setLoading(true);

    try {
      const { error } = await supabase.from("dm_messages").insert({
        conversation_id: activeConversationId,
        user_id: currentUser.id,
        content,
      });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from("dm_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversationId);
    } catch (err) {
      console.error("Failed to send message:", err);
      setInput(content); // Restore input on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setLoading(false);
    }
  }

  // Get friend name by ID
  async function getFriendName(id: string): Promise<string> {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", id)
        .single();
      return data?.username || "Unknown";
    } catch {
      return "Unknown";
    }
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const otherUserId = activeConversation
    ? activeConversation.participants.find((p) => p !== currentUser.id)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        height: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(circle at top right, rgba(120,170,255,0.1), transparent 24%), #0d0d0d",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div style={{ height: "100%", maxWidth: 1200, margin: "0 auto", padding: "1.4rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ height: "100%", display: "grid", gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)", gap: "1rem" }}>
          <aside style={{ border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(15,15,15,0.96), rgba(9,9,9,0.96))", borderRadius: "18px", padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
            <div>
              <p style={{ fontSize: "0.62rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: 0 }}>unstable — messages</p>
              <p style={{ fontSize: "1.45rem", color: "#f3f4f6", margin: "0.55rem 0 0.35rem", lineHeight: 1.05 }}>Direct messages.</p>
              <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.42)", margin: 0, lineHeight: 1.6 }}>
                Private conversations with other users. Search for someone to start a chat.
              </p>
            </div>

            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", paddingLeft: "0.6rem" }}>
                <Search size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                    searchDebounceRef.current = setTimeout(() => {
                      void searchUsers(e.target.value);
                    }, 300);
                  }}
                  onFocus={() => setShowSearch(true)}
                  placeholder="Find users..."
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "0.6rem 0.8rem", color: "#e0e0e0", fontSize: "0.75rem", fontFamily: "'Space Grotesk', sans-serif", width: "100%" }}
                />
              </div>

              <AnimatePresence>
                {showSearch && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "linear-gradient(180deg, rgba(15,15,15,0.98), rgba(10,10,10,0.98))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", zIndex: 10, maxHeight: 200, overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}
                  >
                    {searchResults.map((result) => {
                      const friendship = friendships.find(
                        (f) =>
                          (f.user_id === currentUser.id && f.friend_id === result.id) ||
                          (f.friend_id === currentUser.id && f.user_id === result.id)
                      );

                      return (
                        <motion.div
                          key={result.id}
                          whileHover={{ background: "rgba(255,255,255,0.05)" }}
                          style={{ padding: "0.7rem 0.8rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                          onClick={() => openOrCreateConversation(result.id)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)", fontSize: "0.52rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, flexShrink: 0 }}>
                              {result.username.slice(0, 2)}
                            </div>
                            <span style={{ fontSize: "0.72rem", color: "#e0e0e0" }}>@{result.username}</span>
                          </div>
                          {!friendship && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => { e.stopPropagation(); sendFriendRequest(result.id); }}
                              style={{ background: "rgba(100,150,255,0.2)", border: "1px solid rgba(100,150,255,0.3)", borderRadius: "8px", color: "rgba(120,170,255,0.8)", padding: "0.3rem 0.6rem", fontSize: "0.62rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              <UserPlus size={11} /> Add
                            </motion.button>
                          )}
                          {friendship && (
                            <span style={{ fontSize: "0.6rem", color: "rgba(120,170,255,0.6)", textTransform: "uppercase" }}>
                              {friendship.status}
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.5rem", flex: 1, overflowY: "auto" }}>
              {conversations.length === 0 ? (
                <p style={{ textAlign: "center", fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", padding: "1.5rem 0", margin: 0 }}>No conversations yet</p>
              ) : (
                <AnimatePresence>
                  {conversations.map((conv) => {
                    const otherId = conv.participants.find((p) => p !== currentUser.id);
                    const active = conv.id === activeConversationId;

                    return (
                      <motion.button
                        key={conv.id}
                        whileHover={{ background: "rgba(255,255,255,0.04)" }}
                        onClick={() => setActiveConversationId(conv.id)}
                        role="option"
                        aria-selected={active}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveConversationId(conv.id); } }}
                        style={{
                          width: "100%",
                          background: active ? "rgba(255,255,255,0.06)" : "transparent",
                          border: active ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                          borderRadius: "12px",
                          padding: "0.65rem 0.7rem",
                          marginBottom: "0.25rem",
                          textAlign: "left",
                          cursor: "pointer",
                          color: "#e0e0e0",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: active ? "linear-gradient(135deg, rgba(120,170,255,0.15), rgba(120,170,255,0.06))" : "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))", border: `1px solid ${active ? "rgba(120,170,255,0.25)" : "rgba(255,255,255,0.07)"}`, color: active ? "rgba(120,170,255,0.9)" : "rgba(255,255,255,0.7)", fontSize: "0.52rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, flexShrink: 0 }}>
                            {otherId ? (usernameCache[otherId] || otherId.slice(0, 2)).slice(0, 2) : "??"}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 500, color: active ? "#f3f4f6" : "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {otherId ? `@${usernameCache[otherId] || otherId.slice(0, 8)}` : "Unknown"}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.9rem" }}>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)" }}>Signed in as</p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#eef2f7" }}>{profile?.username}</p>
            </div>
          </aside>

          {activeConversationId ? (
            <section style={{ minWidth: 0, display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(7,7,7,0.98))", borderRadius: "22px", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "0.92rem", color: "#eceff4", fontWeight: 500 }}>Direct Message</p>
                  <p style={{ margin: "0.22rem 0 0", fontSize: "0.65rem", color: "rgba(255,255,255,0.34)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{otherUserId ? `@${usernameCache[otherUserId] || otherUserId.slice(0, 8)}` : ""}</p>
                </div>
              </div>

              <div ref={scrollerRef} style={{ flex: 1, overflowY: "auto", padding: "1.2rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <AnimatePresence>
                  {messages.map((msg, idx) => {
                    const isOwnMessage = msg.user_id === currentUser.id;
                    const senderName = isOwnMessage ? profile?.username : (usernameCache[msg.user_id] || msg.user_id.slice(0, 8));
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                        style={{ display: "flex", justifyContent: isOwnMessage ? "flex-end" : "flex-start" }}
                      >
                        <div style={{ maxWidth: "min(100%, 700px)", display: "flex", flexDirection: isOwnMessage ? "row-reverse" : "row", gap: "0.7rem", alignItems: "flex-end" }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)", fontSize: "0.56rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, flexShrink: 0 }}>
                            {(senderName || "??").slice(0, 2)}
                          </div>
                          <div style={{ position: "relative" }}>
                            <div style={{ borderRadius: isOwnMessage ? "22px 22px 8px 22px" : "22px 22px 22px 8px", background: "linear-gradient(180deg, rgba(25,25,25,0.98), rgba(18,18,18,0.98))", border: "1px solid rgba(255,255,255,0.07)", padding: "0.9rem 1rem", boxShadow: "0 10px 26px rgba(0,0,0,0.18)" }}>
                              <p style={{ margin: "0 0 0.36rem", fontSize: "0.56rem", letterSpacing: "0.16em", textTransform: "uppercase", color: isOwnMessage ? "rgba(255,255,255,0.84)" : "rgba(255,255,255,0.3)" }}>
                                {isOwnMessage ? "you" : senderName}
                              </p>
                              <p style={{ margin: 0, color: "rgba(255,255,255,0.84)", fontSize: "0.79rem", lineHeight: 1.72, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
                            </div>
                            <p style={{ margin: "0.3rem 0 0", fontSize: "0.54rem", color: "rgba(255,255,255,0.28)", textAlign: isOwnMessage ? "right" : "left" }}>
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.1rem 1.1rem" }}>
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  style={{ display: "flex", gap: "0.8rem", alignItems: "flex-end", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px", padding: "0.8rem" }}
                >
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    maxLength={2000}
                    style={{ flex: 1, resize: "none", background: "transparent", border: "none", color: "#eef2f7", fontSize: "0.78rem", lineHeight: 1.6, outline: "none", fontFamily: "'Space Grotesk', sans-serif", minHeight: 24, maxHeight: 180, overflowY: "auto" }}
                  />
                  <motion.button
                    whileHover={{ scale: loading ? 1 : 1.03 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    type="submit"
                    disabled={loading || !input.trim()}
                    style={{ alignSelf: "stretch", minWidth: 104, background: loading || !input.trim() ? "#1b1b1b" : "#e8ecf8", color: loading || !input.trim() ? "rgba(255,255,255,0.25)" : "#0d0d0d", border: "none", borderRadius: "999px", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, padding: "0 1rem" }}
                  >
                    {loading ? "sending" : "send"}
                  </motion.button>
                </form>
              </div>
            </section>
          ) : (
            <section style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(7,7,7,0.98))", borderRadius: "22px", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
              <MessageSquare size={48} style={{ color: "rgba(255,255,255,0.15)" }} />
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", marginTop: "1rem" }}>
                Select a conversation or search for a user to start messaging
              </p>
            </section>
          )}
        </div>
      </div>
    </motion.div>
  );
}
