# Unstable Node - Feature Implementation Guide

## 📋 Summary

You have requested implementation of 5 major features for the Unstable web proxy application:

1. **Direct Messages (DM) System** - Search & friend users to send messages
2. **Account Profile Page** - Edit profile, change password, forgot password, upload avatar
3. **Persistent Chat Feedback** - Save AI message reactions (like/dislike) to database
4. **Voice Input/Output UI** - Voice recording and text-to-speech for AI chat
5. **Extended User Profiles** - Bio, avatar URL, timestamps

---

## ✅ What's Been Created

### 1. **SUPABASE_SETUP.sql** (Ready to copy-paste)
   - **Location**: `SUPABASE_SETUP.sql` in project root
   - **What it does**: Creates all required database tables and security policies
   - **Tables created**:
     - `profiles` (extended with bio, avatar_url, created_at)
     - `friendships` (friend requests & relationships)
     - `dm_conversations` (DM chat rooms)
     - `dm_messages` (individual messages)
     - `ai_chat_feedback` (like/dislike reactions)
   - **Security**: Row-level security (RLS) policies included for user privacy

### 2. **ProfilePage.tsx** (New component)
   - **Location**: `artifacts/app/src/components/ProfilePage.tsx`
   - **Features**:
     - View/edit profile bio
     - Upload profile photo (as data URL)
     - Change password (requires new password)
     - Forgot password (sends reset email via Supabase Auth)
     - Sign out button
     - All changes persisted to Supabase

### 3. **DMChat.tsx** (New component)
   - **Location**: `artifacts/app/src/components/DMChat.tsx`
   - **Features**:
     - Search for users by username
     - Send friend requests to found users
     - View friend request status (pending/accepted)
     - Open direct message conversations
     - Real-time messaging with Supabase Realtime
     - View conversation history
     - All messages persisted to Supabase

### 4. **INTEGRATION_GUIDE.txt** (Step-by-step instructions)
   - **Location**: `INTEGRATION_GUIDE.txt` in project root
   - **What it contains**: Exact code snippets to add to App.tsx
   - **Includes**: Import statements, interface updates, navigation buttons

---

## 🚀 NEXT STEPS - What YOU Need To Do

### STEP 1: Setup Supabase Schema (CRITICAL - Do this first!)
**Time: 5 minutes**

1. Go to your Supabase console: https://app.supabase.com
2. Navigate to the **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Open the file `SUPABASE_SETUP.sql` from your project
5. Copy the entire SQL content
6. Paste into the Supabase SQL Editor
7. Click **"Run"** button
8. Wait for success message

**After SQL runs**, enable Realtime for live chat:
1. Go to **Database** → **Replication** (in Supabase)
2. Find your tables listed: `dm_messages`, `dm_conversations`, `friendships`, `ai_chat_feedback`
3. Toggle ON the replication for each table
4. This enables live message updates across devices

### STEP 2: Integrate Components into App.tsx
**Time: 10 minutes**

1. Open `artifacts/app/src/App.tsx`
2. At the top, add imports (around line 1):
   ```typescript
   import { ProfilePage } from "./components/ProfilePage";
   import { DMChat } from "./components/DMChat";
   ```

3. Update the `Profile` interface (around line 200):
   ```typescript
   interface Profile {
     id: string;
     username: string;
     bio?: string;
     avatar_url?: string;
     created_at?: string;
   }
   ```

4. Update `fetchProfile` function (around line 3800):
   ```typescript
   async function fetchProfile(userId: string): Promise<Profile | null> {
     const { data, error } = await supabase
       .from("profiles")
       .select("id, username, bio, avatar_url, created_at")  // ← Add these fields
       .eq("id", userId)
       .maybeSingle();
     if (error) throw error;
     return data;
   }
   ```

5. Update `createProfile` function (around line 3814):
   ```typescript
   async function createProfile(userId: string, username: string): Promise<Profile> {
     const trimmed = username.trim();
     const { data, error } = await supabase
       .from("profiles")
       .insert({ 
         id: userId, 
         username: trimmed, 
         bio: "", 
         avatar_url: "", 
         created_at: new Date().toISOString() 
       })
       .select("id, username, bio, avatar_url, created_at")
       .single();
     if (error) throw error;
     return data;
   }
   ```

6. Add routing for new pages (find the main page rendering section, around line 5400):
   ```typescript
   else if (currentPage === "profile") {
     return (
       <ProfilePage 
         user={user} 
         profile={profile} 
         onLogout={() => {
           setUser(null);
           setProfile(null);
           setSession(null);
           setCurrentPage("home");
         }}
       />
     );
   } else if (currentPage === "dm") {
     return <DMChat user={user} profile={profile} />;
   }
   ```

7. Add navigation buttons (add to your navigation bar, wherever AI/Chat buttons are):
   ```typescript
   <motion.button
     onClick={() => setCurrentPage("profile")}
     style={{
       background: currentPage === "profile" ? "var(--t-accent)" : "rgba(255,255,255,0.05)",
       color: currentPage === "profile" ? "var(--t-accent-text)" : "rgba(255,255,255,0.5)",
       border: "1px solid var(--t-border-light)",
       borderRadius: "10px",
       padding: "0.5rem 1rem",
       fontSize: "0.7rem",
       cursor: "pointer",
       letterSpacing: "0.08em",
       textTransform: "uppercase",
     }}
   >
     Profile
   </motion.button>

   <motion.button
     onClick={() => setCurrentPage("dm")}
     style={{
       background: currentPage === "dm" ? "var(--t-accent)" : "rgba(255,255,255,0.05)",
       color: currentPage === "dm" ? "var(--t-accent-text)" : "rgba(255,255,255,0.5)",
       border: "1px solid var(--t-border-light)",
       borderRadius: "10px",
       padding: "0.5rem 1rem",
       fontSize: "0.7rem",
       cursor: "pointer",
       letterSpacing: "0.08em",
       textTransform: "uppercase",
     }}
   >
     Messages
   </motion.button>
   ```

### STEP 3: Persist AI Chat Feedback
**Time: 5 minutes**

1. In `AIPageInner` component, find the feedback buttons section (search for "ThumbsUp")
2. Add this function in the component:
   ```typescript
   async function saveFeedback(messageId: string, feedbackType: "like" | "dislike" | null) {
     try {
       if (feedbackType === null) {
         await supabase
           .from("ai_chat_feedback")
           .delete()
           .eq("message_id", messageId)
           .eq("user_id", user.id);
       } else {
         await supabase
           .from("ai_chat_feedback")
           .upsert({
             message_id: messageId,
             user_id: user.id,
             feedback_type: feedbackType,
           });
       }
       setFeedback(prev => ({ ...prev, [messageId]: feedbackType }));
     } catch (err) {
       console.error("Failed to save feedback:", err);
     }
   }
   ```

3. Update the feedback button click handlers (find the thumbs up/down buttons):
   ```typescript
   onClick={() => saveFeedback(message.id, feedback[message.id] === "like" ? null : "like")}
   ```

4. Add this useEffect to load existing feedback:
   ```typescript
   useEffect(() => {
     if (!activeId) return;
     let cancelled = false;
     async function loadFeedback() {
       try {
         const { data } = await supabase
           .from("ai_chat_feedback")
           .select("message_id, feedback_type")
           .eq("user_id", user.id);
         
         if (!cancelled && data) {
           const feedbackMap: Record<string, "like" | "dislike"> = {};
           data.forEach(f => {
             feedbackMap[f.message_id] = f.feedback_type;
           });
           setFeedback(feedbackMap);
         }
       } catch (err) {
         console.error("Failed to load feedback:", err);
       }
     }
     loadFeedback();
     return () => { cancelled = true; };
   }, [activeId, user.id]);
   ```

---

## 🎤 Voice Features - Already Implemented!

Good news! The voice input/output is already partially implemented in the existing AI page:

### Voice Input (Recording)
- The **Mic button** is already wired up with Web Speech API
- Located in `AIPageInner` component
- Users can click to record their voice
- Transcript is automatically inserted into the chat

### Voice Output (Text-to-Speech)
- The **Volume icon** with "read" button is already implemented
- Click to hear the AI's response spoken aloud
- Uses native `SpeechSynthesisUtterance` API
- Includes stop button when speaking

Both features use standard browser APIs and work without additional setup!

---

## 📁 Files Created

```
Project-Unstable-Node/
├── SUPABASE_SETUP.sql                           ← Copy-paste into Supabase SQL Editor
├── INTEGRATION_GUIDE.txt                        ← Step-by-step integration help
└── artifacts/app/src/components/
    ├── ProfilePage.tsx                          ← New component (ready to use)
    └── DMChat.tsx                               ← New component (ready to use)
```

---

## 🔑 Key Points

### What needs to happen in Supabase console:
1. **Run SQL migrations** from `SUPABASE_SETUP.sql`
2. **Enable Realtime** on tables for live chat

### What needs to happen in your code:
1. **Import** the new components
2. **Update** the Profile interface & fetching functions
3. **Add** routing for profile & dm pages
4. **Add** navigation buttons to your UI
5. **Save** feedback to database when clicking reactions

### What's already working:
- Voice recording (Mic button)
- Voice playback (Volume/Read button)
- All existing AI chat features

---

## 💾 Database Structure

```
profiles
├── id (uuid, primary key)
├── username (text)
├── bio (text) ← NEW
├── avatar_url (text) ← NEW
└── created_at (timestamp) ← NEW

friendships ← NEW TABLE
├── id (uuid, primary key)
├── user_id (uuid)
├── friend_id (uuid)
├── status ('pending' | 'accepted' | 'blocked')
├── requested_by (uuid)
└── created_at (timestamp)

dm_conversations ← NEW TABLE
├── id (uuid, primary key)
├── participants (uuid[])
└── created_at (timestamp)

dm_messages ← NEW TABLE
├── id (uuid, primary key)
├── conversation_id (uuid)
├── user_id (uuid)
├── content (text)
└── created_at (timestamp)

ai_chat_feedback ← NEW TABLE
├── id (uuid, primary key)
├── message_id (uuid)
├── user_id (uuid)
├── feedback_type ('like' | 'dislike')
└── created_at (timestamp)
```

---

## ❓ Questions?

If you run into issues:
1. Check that SQL migrations ran successfully in Supabase
2. Verify Realtime is enabled for the chat tables
3. Make sure imports match the file paths
4. Check browser console for TypeScript/runtime errors

All components are type-safe and ready to integrate!
