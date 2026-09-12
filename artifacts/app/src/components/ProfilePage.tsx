import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Pencil, Lock, LogOut, Upload, X, Bell, UserPlus, Check, Minus } from "lucide-react";
import { supabase } from "../supabase";
import type { User as AuthUser } from "@supabase/supabase-js";

interface ExtendedProfile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "blocked";
  requested_by: string;
  created_at: string;
}

export function ProfilePage({
  user,
  profile,
  onLogout,
}: {
  user: AuthUser | null;
  profile: ExtendedProfile | null;
  onLogout: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? "");
  const [usernamePassword, setUsernamePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Password management
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendRequestLoading, setFriendRequestLoading] = useState(false);
  const [dmUnreadCount, setDmUnreadCount] = useState(0);

  const currentUser = user!;
  const currentProfile = profile!;

  useEffect(() => {
    setUsername(profile?.username ?? "");
    setBio(profile?.bio ?? "");
    setAvatar(profile?.avatar_url ?? "");
  }, [profile?.username, profile?.bio, profile?.avatar_url]);

  useEffect(() => {
    if (currentUser?.email) {
      setForgotEmail(currentUser.email);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const syncUnreadCount = () => {
      const raw = Number(localStorage.getItem(`unstable_dm_unread_total_${currentUser.id}`) || "0");
      setDmUnreadCount(Number.isFinite(raw) ? raw : 0);
    };

    syncUnreadCount();
    window.addEventListener("storage", syncUnreadCount);
    return () => window.removeEventListener("storage", syncUnreadCount);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;

    async function loadFriendRequests() {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("friend_id", currentUser.id)
        .eq("status", "pending");

      if (error) {
        console.error("Failed to load friend requests:", error);
        return;
      }

      setFriendRequests(data || []);
    }

    loadFriendRequests();
  }, [currentUser?.id]);

  if (!currentUser || !currentProfile) {
    const nextFeatures = [
      "DMs and friend requests",
      "Profile customization",
      "AI history and saved prompts",
      "Voice input and assistant audio",
      "Bookmarks, downloads, and sync",
    ];

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
          padding: "2rem 1rem",
        }}
      >
        <div style={{ width: "min(520px, 100%)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              background: "var(--t-bg-secondary)",
              border: "1px solid var(--t-border-light)",
              borderRadius: "18px",
              padding: "1.8rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.65rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
              unstable account
            </p>
            <h2 style={{ margin: "0.8rem 0 0.5rem", fontSize: "1.5rem", color: "#f2f4f8" }}>Profile is waiting for you</h2>
            <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}>
              Sign in to unlock your profile, DMs, friend requests, AI history, and saved account settings.
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.reload()}
              style={{
                marginTop: "1.2rem",
                width: "100%",
                background: "var(--t-accent)",
                color: "var(--t-accent-text)",
                border: "none",
                borderRadius: "10px",
                padding: "0.8rem 1rem",
                fontSize: "0.7rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign in
            </motion.button>
          </div>

          <div
            style={{
              background: "var(--t-bg-secondary)",
              border: "1px solid var(--t-border-light)",
              borderRadius: "18px",
              padding: "1.5rem 1.2rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
              Next up
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", marginTop: "0.9rem" }}>
              {nextFeatures.map((feature) => (
                <div
                  key={feature}
                  style={{
                    background: "var(--t-bg)",
                    border: "1px solid var(--t-border-light)",
                    borderRadius: "10px",
                    padding: "0.8rem 0.9rem",
                    color: "rgba(255,255,255,0.72)",
                    fontSize: "0.75rem",
                  }}
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  async function saveProfile() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) throw new Error("Username cannot be empty.");

      const usernameChanged = trimmedUsername.toLowerCase() !== currentProfile.username.toLowerCase();
      if (usernameChanged) {
        const cooldownMs = 7 * 24 * 60 * 60 * 1000;
        const lastChangedAt = Number(localStorage.getItem(`unstable_username_change_${currentUser.id}`) || "0");
        if (Date.now() - lastChangedAt < cooldownMs) {
          throw new Error("You can only change your username once per week.");
        }
        if (!usernamePassword.trim()) {
          throw new Error("Enter your password to change your username.");
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: currentUser.email ?? "",
          password: usernamePassword,
        });

        if (signInError || !signInData.user) {
          throw new Error("Incorrect password. Username changes require password verification.");
        }
      }

      const { error: err } = await supabase
        .from("profiles")
        .update({ username: trimmedUsername, bio, avatar_url: avatar })
        .eq("id", currentUser.id);
      if (err) throw err;

      if (usernameChanged) {
        localStorage.setItem(`unstable_username_change_${currentUser.id}`, String(Date.now()));
      }

      setSuccess("Profile updated successfully");
      setUsernamePassword("");
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  async function sendResetPassword() {
    setForgotSuccess("");
    setError("");
    setForgotLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail);
      if (err) throw err;
      setForgotSuccess("Password reset link sent to your email");
      setShowForgotPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setForgotLoading(false);
    }
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function updateFriendRequestStatus(requestId: string, nextStatus: "accepted" | "blocked") {
    setFriendRequestLoading(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: nextStatus })
        .eq("id", requestId);

      if (error) throw error;
      setFriendRequests((prev) => prev.filter((request) => request.id !== requestId));
    } catch (err) {
      console.error("Failed to update friend request:", err);
    } finally {
      setFriendRequestLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        height: "100%",
        overflow: "auto",
        background: "var(--t-bg)",
        fontFamily: "'Space Grotesk', sans-serif",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: 0, marginBottom: "1rem" }}>
            unstable account
          </p>
          <h1 style={{ fontSize: "1.4rem", color: "#e8e8e8", margin: 0 }}>Profile Settings</h1>
        </motion.div>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "var(--t-bg-secondary)",
            border: "1px solid var(--t-border-light)",
            borderRadius: "18px",
            padding: "1.8rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Avatar section */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: avatar ? `url(${avatar})` : "transparent",
                backgroundSize: "cover",
                backgroundPosition: "center",
                margin: "0 auto 1rem",
                border: "2px solid var(--t-border-light)",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!avatar && <User size={42} style={{ color: "rgba(255,255,255,0.8)" }} />}
            </div>
            {editMode && (
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "var(--t-accent)",
                  color: "var(--t-accent-text)",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  marginTop: "0.5rem",
                }}
              >
                <Upload size={14} />
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>

          {/* Edit mode toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setEditMode(!editMode)}
            style={{
              width: "100%",
              background: editMode ? "var(--t-accent)" : "var(--t-bg)",
              color: editMode ? "var(--t-accent-text)" : "var(--t-text)",
              border: `1px solid ${editMode ? "var(--t-accent)" : "var(--t-border-light)"}`,
              padding: "0.7rem",
              borderRadius: "10px",
              fontSize: "0.7rem",
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              marginBottom: "1.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              fontWeight: 600,
            }}
          >
            <Pencil size={14} />
            {editMode ? "Done Editing" : "Edit Profile"}
          </motion.button>

          {/* Username */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.4rem" }}>
              Username
            </label>
            {editMode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    background: "var(--t-bg)",
                    border: "1px solid var(--t-border-light)",
                    borderRadius: "10px",
                    padding: "0.75rem 1rem",
                    color: "var(--t-text)",
                    fontSize: "0.8rem",
                    fontFamily: "'Space Grotesk', sans-serif",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {username !== currentProfile.username && (
                  <input
                    type="password"
                    value={usernamePassword}
                    onChange={(e) => setUsernamePassword(e.target.value)}
                    placeholder="password to confirm username change"
                    style={{
                      background: "var(--t-bg)",
                      border: "1px solid var(--t-border-light)",
                      borderRadius: "10px",
                      padding: "0.75rem 1rem",
                      color: "var(--t-text)",
                      fontSize: "0.8rem",
                      fontFamily: "'Space Grotesk', sans-serif",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                )}
              </div>
            ) : (
              <div
                style={{
                  background: "var(--t-bg)",
                  border: "1px solid var(--t-border)",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  color: "var(--t-text)",
                  fontSize: "0.8rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <User size={14} /> @{username}
              </div>
            )}
          </motion.div>

          {/* Email */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.4rem" }}>
              Email
            </label>
            <div
              style={{
                background: "var(--t-bg)",
                border: "1px solid var(--t-border)",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                color: "var(--t-text)",
                fontSize: "0.8rem",
                fontFamily: "'Space Grotesk', sans-serif",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                wordBreak: "break-all",
              }}
            >
              <Mail size={14} /> {currentUser.email}
            </div>
          </motion.div>

          {/* Bio */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--t-text-muted)", marginBottom: "0.4rem" }}>
              Bio
            </label>
            {editMode ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write something about yourself..."
                style={{
                  width: "100%",
                  background: "var(--t-bg)",
                  border: "1px solid var(--t-border-light)",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  color: "var(--t-text)",
                  fontSize: "0.8rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  outline: "none",
                  minHeight: 80,
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            ) : (
              <div
                style={{
                  background: "var(--t-bg)",
                  border: "1px solid var(--t-border)",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  color: bio ? "var(--t-text)" : "var(--t-text-muted)",
                  fontSize: "0.8rem",
                  minHeight: 60,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {bio || "No bio yet"}
              </div>
            )}
          </motion.div>

          {/* Save button (in edit mode) */}
          <AnimatePresence>
            {editMode && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={saveProfile}
                disabled={loading}
                style={{
                  width: "100%",
                  background: loading ? "#555" : "var(--t-accent)",
                  color: loading ? "#999" : "var(--t-accent-text)",
                  border: "none",
                  padding: "0.7rem",
                  borderRadius: "10px",
                  fontSize: "0.7rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {loading ? "Saving..." : "Save Changes"}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                style={{ color: "rgba(220,80,80,0.9)", fontSize: "0.68rem", marginTop: "0.5rem", margin: 0 }}
              >
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                style={{ color: "rgba(100,200,100,0.9)", fontSize: "0.68rem", marginTop: "0.5rem", margin: 0 }}
              >
                {success}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Social section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: "var(--t-bg-secondary)",
            border: "1px solid var(--t-border-light)",
            borderRadius: "18px",
            padding: "1.8rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <Bell size={18} style={{ color: "rgba(255,255,255,0.5)" }} />
            <h2 style={{ fontSize: "1.1rem", color: "#e8e8e8", margin: 0 }}>Social</h2>
            {dmUnreadCount > 0 && (
              <span
                style={{
                  background: "rgba(120,170,255,0.2)",
                  color: "#dfe9ff",
                  borderRadius: "999px",
                  padding: "0.15rem 0.45rem",
                  fontSize: "0.62rem",
                  minWidth: 18,
                  textAlign: "center",
                }}
              >
                {dmUnreadCount}
              </span>
            )}
          </div>

          <div
            style={{
              background: "var(--t-bg)",
              border: "1px solid var(--t-border-light)",
              borderRadius: "12px",
              padding: "0.9rem 1rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <UserPlus size={15} style={{ color: "rgba(255,255,255,0.5)" }} />
              <span style={{ fontSize: "0.7rem", color: "var(--t-text)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                DM unread badges
              </span>
            </div>
            <span style={{ color: dmUnreadCount > 0 ? "#dfe9ff" : "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
              {dmUnreadCount}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <UserPlus size={15} style={{ color: "rgba(255,255,255,0.5)" }} />
              <h3 style={{ margin: 0, fontSize: "0.8rem", color: "#f2f3f5" }}>Friend requests</h3>
            </div>

            {friendRequests.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(255,255,255,0.42)" }}>
                No new friend requests.
              </p>
            ) : (
              friendRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    background: "var(--t-bg)",
                    border: "1px solid var(--t-border-light)",
                    borderRadius: "12px",
                    padding: "0.8rem 0.9rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "#eaeef6" }}>@{request.user_id.slice(0, 8)}</p>
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.62rem", color: "rgba(255,255,255,0.4)" }}>Wants to connect</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={friendRequestLoading}
                      onClick={() => updateFriendRequestStatus(request.id, "accepted")}
                      style={{
                        background: "rgba(100,200,100,0.15)",
                        border: "1px solid rgba(100,200,100,0.35)",
                        color: "rgba(160,240,160,0.9)",
                        borderRadius: "8px",
                        padding: "0.4rem 0.55rem",
                        cursor: friendRequestLoading ? "not-allowed" : "pointer",
                      }}
                    >
                      <Check size={13} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={friendRequestLoading}
                      onClick={() => updateFriendRequestStatus(request.id, "blocked")}
                      style={{
                        background: "rgba(220,80,80,0.12)",
                        border: "1px solid rgba(220,80,80,0.3)",
                        color: "rgba(240,160,160,0.9)",
                        borderRadius: "8px",
                        padding: "0.4rem 0.55rem",
                        cursor: friendRequestLoading ? "not-allowed" : "pointer",
                      }}
                    >
                      <Minus size={13} />
                    </motion.button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Security / recovery section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: "var(--t-bg-secondary)",
            border: "1px solid var(--t-border-light)",
            borderRadius: "18px",
            padding: "1.8rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Lock size={18} style={{ color: "rgba(255,255,255,0.5)" }} />
            <h2 style={{ fontSize: "1.1rem", color: "#e8e8e8", margin: 0 }}>Security</h2>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForgotPassword(!showForgotPassword)}
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid var(--t-border-light)",
              color: "var(--t-text)",
              fontSize: "0.65rem",
              cursor: "pointer",
              letterSpacing: "0.06em",
              padding: "0.8rem 0.9rem",
              borderRadius: "10px",
              fontWeight: 600,
            }}
          >
            Forgot password
          </motion.button>

          <AnimatePresence>
            {showForgotPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginTop: "1rem" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                    We'll send a password reset link to your email.
                  </p>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--t-bg)",
                      border: "1px solid var(--t-border-light)",
                      borderRadius: "10px",
                      padding: "0.7rem 1rem",
                      color: "var(--t-text)",
                      fontSize: "0.8rem",
                      fontFamily: "'Space Grotesk', sans-serif",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={sendResetPassword}
                    disabled={forgotLoading}
                    style={{
                      background: forgotLoading ? "#555" : "var(--t-accent)",
                      color: forgotLoading ? "#999" : "var(--t-accent-text)",
                      border: "none",
                      padding: "0.7rem",
                      borderRadius: "10px",
                      fontSize: "0.7rem",
                      fontFamily: "'Space Grotesk', sans-serif",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: forgotLoading ? "not-allowed" : "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {forgotLoading ? "Sending..." : "Send Reset Link"}
                  </motion.button>
                  {error && (
                    <p style={{ color: "rgba(220,80,80,0.9)", fontSize: "0.68rem", margin: 0 }}>
                      {error}
                    </p>
                  )}
                  {forgotSuccess && (
                    <p style={{ color: "rgba(100,200,100,0.9)", fontSize: "0.68rem", margin: 0 }}>
                      {forgotSuccess}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Sign out button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onLogout}
          style={{
            width: "100%",
            background: "rgba(220,80,80,0.15)",
            border: "1px solid rgba(220,80,80,0.3)",
            color: "rgba(220,80,80,0.9)",
            padding: "0.8rem",
            borderRadius: "10px",
            fontSize: "0.75rem",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
          }}
        >
          <LogOut size={14} />
          Sign Out
        </motion.button>
      </div>
    </motion.div>
  );
}
