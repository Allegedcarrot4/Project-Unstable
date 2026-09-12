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
  const scrollerRef = useRef<HTMLDivElement>(null);

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
  }, [currentUser.id, activeConversationId]);

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
  async function searchUsers() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${searchQuery}%`)
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
    setInput("");
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

      // Reload messages
      const { data } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    } catch (err) {
      console.error("Failed to send message:", err);
      setInput(content); // Restore input on error
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
        background: "#0d0d0d",
        fontFamily: "'Space Grotesk', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Mobile menu button */}
      <div style={{ display: "flex", height: "100%" }}>
        {/* Sidebar */}
        <motion.aside
          style={{
            width: 300,
            borderRight: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(180deg, rgba(15,15,15,0.96), rgba(9,9,9,0.96))",
          }}
        >
          {/* Search bar */}
          <div style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                paddingLeft: "0.6rem",
              }}
            >
              <Search size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers();
                }}
                onFocus={() => setShowSearch(true)}
                placeholder="Find users..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: "0.6rem 0.8rem",
                  color: "#e0e0e0",
                  fontSize: "0.75rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  width: "100%",
                }}
              />
            </div>

            {/* Search results */}
            <AnimatePresence>
              {showSearch && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  style={{
                    position: "absolute",
                    top: 52,
                    left: "1rem",
                    right: "1rem",
                    background: "#181818",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    zIndex: 10,
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
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
                        style={{
                          padding: "0.7rem 0.8rem",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                        onClick={() => openOrCreateConversation(result.id)}
                      >
                        <span style={{ fontSize: "0.75rem", color: "#e0e0e0" }}>
                          @{result.username}
                        </span>
                        {!friendship && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              sendFriendRequest(result.id);
                            }}
                            style={{
                              background: "rgba(100,150,255,0.2)",
                              border: "1px solid rgba(100,150,255,0.3)",
                              borderRadius: "6px",
                              color: "rgba(120,170,255,0.8)",
                              padding: "0.3rem 0.6rem",
                              fontSize: "0.62rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            <UserPlus size={11} /> Add
                          </motion.button>
                        )}
                        {friendship && (
                          <span
                            style={{
                              fontSize: "0.6rem",
                              color: "rgba(120,170,255,0.6)",
                              textTransform: "uppercase",
                            }}
                          >
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

          {/* Conversations list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
            {conversations.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  fontSize: "0.68rem",
                  color: "rgba(255,255,255,0.25)",
                  padding: "1.5rem 0",
                  margin: 0,
                }}
              >
                No conversations yet
              </p>
            ) : (
              <AnimatePresence>
                {conversations.map((conv) => {
                  const otherId = conv.participants.find((p) => p !== currentUser.id);
                  const active = conv.id === activeConversationId;

                  return (
                    <motion.button
                      key={conv.id}
                      whileHover={{ background: "rgba(255,255,255,0.05)" }}
                      onClick={() => setActiveConversationId(conv.id)}
                      style={{
                        width: "100%",
                        background: active ? "rgba(255,255,255,0.06)" : "transparent",
                        border: active ? "1px solid rgba(255,255,255,0.1)" : "none",
                        borderRadius: "10px",
                        padding: "0.8rem",
                        marginBottom: "0.3rem",
                        textAlign: "left",
                        cursor: "pointer",
                        color: "#e0e0e0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <User size={16} style={{ flexShrink: 0, color: "rgba(120,170,255,0.6)" }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {otherId && "@" + otherId.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </motion.aside>

        {/* Chat area */}
        {activeConversationId ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            {/* Header */}
            <div
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                padding: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <MessageSquare size={18} style={{ color: "rgba(120,170,255,0.6)" }} />
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#e0e0e0", flex: 1 }}>
                Direct Message
              </p>
            </div>

            {/* Messages */}
            <div ref={scrollerRef} style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <AnimatePresence>
                {messages.map((msg) => {
                  const isOwnMessage = msg.user_id === currentUser.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      layout
                      style={{
                        display: "flex",
                        justifyContent: isOwnMessage ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "60%",
                          background: isOwnMessage
                            ? "rgba(120,170,255,0.2)"
                            : "rgba(255,255,255,0.05)",
                          border: `1px solid ${
                            isOwnMessage
                              ? "rgba(120,170,255,0.3)"
                              : "rgba(255,255,255,0.1)"
                          }`,
                          borderRadius: isOwnMessage ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                          padding: "0.7rem 0.9rem",
                          color: "#e0e0e0",
                          fontSize: "0.8rem",
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}
                      >
                        <p style={{ margin: 0 }}>{msg.content}</p>
                        <p
                          style={{
                            margin: "0.3rem 0 0",
                            fontSize: "0.65rem",
                            color: isOwnMessage
                              ? "rgba(120,170,255,0.5)"
                              : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                padding: "1rem",
                background: "linear-gradient(180deg, rgba(11,11,11,0.96), rgba(8,8,8,0.98))",
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    padding: "0.7rem 1rem",
                    color: "#e0e0e0",
                    fontSize: "0.75rem",
                    fontFamily: "'Space Grotesk', sans-serif",
                    outline: "none",
                  }}
                />
                <motion.button
                  whileHover={{ scale: loading ? 1 : 1.05 }}
                  whileTap={{ scale: loading ? 1 : 0.95 }}
                  type="submit"
                  disabled={loading || !input.trim()}
                  style={{
                    background:
                      loading || !input.trim() ? "#333" : "var(--t-accent)",
                    color:
                      loading || !input.trim()
                        ? "#999"
                        : "var(--t-accent-text)",
                    border: "none",
                    borderRadius: "999px",
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                    padding: 0,
                  }}
                >
                  <Send size={16} />
                </motion.button>
              </form>
            </div>
          </motion.section>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
            }}
          >
            <MessageSquare size={48} style={{ color: "rgba(255,255,255,0.15)" }} />
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>
              Select a conversation or search for a user to start messaging
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
