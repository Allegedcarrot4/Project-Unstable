-- ═══════════════════════════════════════════════════════════════════════════════
-- UNSTABLE NODE - SUPABASE SCHEMA SETUP
-- Copy and paste each section into your Supabase SQL Editor
-- Database: https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. EXTEND PROFILES TABLE ──────────────────────────────────────────────────
-- Add new columns to the existing profiles table for user info and profile features
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- ─── 2. FRIENDSHIPS TABLE ─────────────────────────────────────────────────────
-- Stores friend requests and friendships
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_created_at ON friendships(created_at DESC);

-- ─── 3. DM_CONVERSATIONS TABLE ────────────────────────────────────────────────
-- Stores direct message conversations between users
CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  participants UUID[] DEFAULT '{}'::uuid[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_conversations_participants ON dm_conversations USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_dm_conversations_created_at ON dm_conversations(created_at DESC);

-- ─── 4. DM_MESSAGES TABLE ────────────────────────────────────────────────────
-- Stores individual messages in DM conversations
CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation_id ON dm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_user_id ON dm_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created_at ON dm_messages(created_at DESC);

-- ─── 5. AI_CHAT_FEEDBACK TABLE ────────────────────────────────────────────────
-- Stores feedback (likes/dislikes) on AI messages
CREATE TABLE IF NOT EXISTS ai_chat_feedback (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT CHECK (feedback_type IN ('like', 'dislike')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_feedback_message_id ON ai_chat_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_feedback_user_id ON ai_chat_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_feedback_created_at ON ai_chat_feedback(created_at DESC);

-- ─── 6. SETUP ROW LEVEL SECURITY (RLS) ────────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_feedback ENABLE ROW LEVEL SECURITY;

-- Friendships RLS Policies
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Users can update their own friend requests" ON friendships
  FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships" ON friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- DM Conversations RLS Policies
CREATE POLICY "Users can view conversations they're in" ON dm_conversations
  FOR SELECT USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can create conversations" ON dm_conversations
  FOR INSERT WITH CHECK (auth.uid() = ANY(participants));

-- DM Messages RLS Policies
CREATE POLICY "Users can view messages in their conversations" ON dm_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dm_conversations 
      WHERE id = conversation_id AND auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can send messages" ON dm_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit their own messages" ON dm_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- AI Chat Feedback RLS Policies
CREATE POLICY "Users can view feedback on their messages" ON ai_chat_feedback
  FOR SELECT USING (true);

CREATE POLICY "Users can add feedback" ON ai_chat_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON ai_chat_feedback
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback" ON ai_chat_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Now enable Realtime on these tables:
-- 1. Go to Database → Replication in Supabase console
-- 2. Add these tables: dm_messages, dm_conversations, friendships, ai_chat_feedback
-- This enables real-time updates for chat and friend notifications
-- ═══════════════════════════════════════════════════════════════════════════════
