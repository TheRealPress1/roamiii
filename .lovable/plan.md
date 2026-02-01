

# TripChat: Complete Application Rebuild Plan

This plan transforms the existing "Trip Arena" board-style voting platform into "TripChat" - a group-chat-style trip planning application. This is a major architectural shift that requires new database tables, new UI components, and a fundamentally different user experience.

---

## Overview

**Current State**: Trip Arena - A visual-first platform with Trip Boards, Proposal cards, and a tab-based voting interface.

**Target State**: TripChat - A group chat experience where each trip is a private chat room with proposal cards embedded in the message stream.

**Key Paradigm Shift**: From "dashboard → board → tabs → proposals" to "dashboard → trip chat room with messages + right sidebar panel"

---

## Phase 1: Database Schema Changes

### New Tables Required

1. **`trips` table** (replaces mental model of "boards")
   - Add `flexible_dates` boolean column
   - Add `join_code` column (unique 6-8 character code for easy sharing)
   - Add `pinned_proposal_id` (replaces `chosen_proposal_id`)
   - Rename status values: `planning` | `decided` (instead of `active` | `decided` | `archived`)

2. **`trip_members` table** (mirrors `board_members`)
   - Same structure, references `trips` instead of `boards`

3. **`messages` table** (new - core chat functionality)
   - `id`, `trip_id`, `user_id`
   - `type`: `text` | `proposal` | `system`
   - `body` (nullable - for text/system messages)
   - `proposal_id` (nullable - for proposal messages)
   - `created_at`

4. **`proposals` table** (keep existing, update references)
   - Change `board_id` → `trip_id`

5. **`proposal_comments` table** (separate from chat messages)
   - Comments specific to a proposal (not in main chat)
   - `id`, `proposal_id`, `trip_id`, `user_id`, `body`, `created_at`

6. **`message_reactions` table** (for emoji reactions on messages)
   - `id`, `message_id`, `user_id`, `emoji`, `created_at`

### Database Migration Strategy
- Create new tables alongside existing ones
- Create new RLS policies matching security model
- Add helper functions: `is_trip_member()`, `is_trip_admin()`, `is_trip_owner()`
- Add trigger to auto-create owner when trip is created

### Storage Bucket
- Create `tripchat-images` storage bucket for proposal cover images and message attachments

---

## Phase 2: Core UI Architecture

### Route Changes

| Old Route | New Route | Purpose |
|-----------|-----------|---------|
| `/` | `/` | Landing page (rebrand to TripChat) |
| `/auth` | `/auth` | Authentication (rebrand) |
| `/app` | `/app` | Main dashboard with "Create/Join Trip" + trip list |
| `/app/create` | `/app/create` | 2-step trip creation wizard |
| N/A | `/app/join` | Join trip via code/link |
| `/app/board/:boardId` | `/app/trip/:tripId` | Trip chat room (major redesign) |
| `/app/board/:boardId/propose` | (modal inside chat) | Proposal creation modal |
| N/A | `/app/trip/:tripId/proposal/:proposalId` | Proposal detail view |
| N/A | `/app/trip/:tripId/summary` | Final decision summary page |

### New Layout: Trip Chat Room

```text
+----------------------------------------------------------+
|  [Back]  Trip Name                    [Settings] [Panel] |
+----------------------------------------------------------+
|                                    |                      |
|   CHAT FEED                        |   TRIP PANEL         |
|   (scrollable messages)            |   - Trip basics      |
|                                    |   - Members list     |
|   [Text message bubble]            |   - Proposals ranked |
|   [System: "John joined"]          |   - Pinned decision  |
|   [PROPOSAL CARD embedded]         |                      |
|     - Image, destination           |                      |
|     - Vote buttons inline          |                      |
|   [Text message bubble]            |                      |
|                                    |                      |
|----------------------------------- |                      |
|  [Input] [Attach] [Send] [Propose] |                      |
+----------------------------------------------------------+
```

---

## Phase 3: New Components

### Chat Components
1. **`ChatFeed.tsx`** - Scrollable message list with auto-scroll
2. **`ChatMessage.tsx`** - Renders text/system messages
3. **`ProposalMessage.tsx`** - Rich proposal card embedded in chat
4. **`ChatComposer.tsx`** - Input with send, attach, and propose buttons
5. **`MessageReactions.tsx`** - Emoji reaction picker and display

### Trip Panel Components
1. **`TripPanel.tsx`** - Right sidebar with trip info
2. **`TripBasicsSection.tsx`** - Name, dates, budget, countdown
3. **`MembersSection.tsx`** - Avatar list with invite button
4. **`ProposalsRanking.tsx`** - Sorted proposal mini-cards
5. **`PinnedDecision.tsx`** - Final pick display

### Proposal Components
1. **`ProposalDetailModal.tsx`** - Full proposal view with carousel
2. **`ProposalComments.tsx`** - Comments specific to a proposal
3. **`CreateProposalModal.tsx`** - Modal for proposal creation

### Join/Invite Components
1. **`JoinTrip.tsx`** - Join by code or link
2. **`InviteModal.tsx`** - Email invite interface

---

## Phase 4: Feature Implementation

### 4.1 Landing Page Updates
- Rebrand from "Trip Arena" to "TripChat"
- Update hero text: "Group trip planning that feels like a chat"
- Update mock preview to show chat-style interface
- Change CTAs to "Create a Trip" / "Sign In"

### 4.2 Main Dashboard (`/app`)
- Centered layout with two prominent buttons:
  - "Create a Trip" (primary)
  - "Join a Trip" (secondary)
- "Your Trips" list below showing:
  - Trip name, date window, member count
  - Status badge (Planning / Decided)
  - Last message preview OR pinned proposal title
- Empty state with illustration

### 4.3 Create Trip Flow (`/app/create`)
- **Step 1: Trip Setup**
  - Trip name (required)
  - Date window (start/end or flexible toggle)
  - Home city (optional)
  - Budget guidance (min/max per person, optional)
  - Decision deadline (optional)
  
- **Step 2: Invite Crew**
  - Multi-email input (up to 30)
  - Optional message
  - Generate join code automatically
  - On create: redirect to trip chat

### 4.4 Join Trip Flow (`/app/join`)
- Input for join code (6-8 characters)
- Auto-detect if coming from invite link with token
- Validate and add user to trip_members
- Redirect to trip chat on success

### 4.5 Trip Chat Room (`/app/trip/:tripId`)
- **Chat Feed**:
  - Chronological messages
  - Three types: text, proposal, system
  - Proposal cards show vote buttons inline
  - Emoji reactions on any message
  
- **Composer**:
  - Text input with multiline support
  - Attach button (image upload)
  - Send button
  - "Propose" button opens proposal modal

- **Trip Panel** (desktop: sidebar, mobile: drawer):
  - Trip basics with countdown
  - Members with invite option
  - Proposals ranked by support
  - Pinned decision section

### 4.6 Proposal Creation (Modal)
- Destination (required)
- Date range OR "Flexible" toggle
- Cover image upload (required)
- Additional images (up to 6, optional)
- Vibe tags (preset + custom)
- Lodging links (1-3)
- Cost estimator with per-person auto-calc
- On submit: create proposal + post message to chat

### 4.7 Proposal Detail View
- Full image carousel
- Complete cost breakdown table
- Votes list (who voted what)
- Proposal-specific comments section
- Pin button for owner/admin

### 4.8 Decision Flow
- Owner/admin can "Pin as Final Pick" from proposal detail
- System message posted: "Final pick pinned: [Destination]"
- Trip status changes to `decided`
- Summary page becomes available

### 4.9 Summary Page (`/app/trip/:tripId/summary`)
- Final destination with dates
- Lodging links
- Estimated cost per person
- Committed members (voted "In")
- Share options: email summary to members, copy link

---

## Phase 5: Real-time Features

### Supabase Realtime Subscriptions
- Enable realtime on `messages` table for live chat
- Subscribe to proposal votes for instant updates
- Subscribe to trip status changes

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
```

---

## Phase 6: File Structure

### New Files to Create
```text
src/
  pages/
    TripChat.tsx         # Main trip chat room
    JoinTrip.tsx         # Join trip page
    TripSummary.tsx      # Final decision summary
  components/
    chat/
      ChatFeed.tsx
      ChatMessage.tsx
      ProposalMessage.tsx
      ChatComposer.tsx
      MessageReactions.tsx
    trip/
      TripPanel.tsx
      TripBasicsSection.tsx
      MembersSection.tsx
      ProposalsRanking.tsx
      PinnedDecision.tsx
    proposal/
      CreateProposalModal.tsx
      ProposalDetailModal.tsx
      ProposalComments.tsx
    invite/
      InviteModal.tsx
  hooks/
    useTripMessages.ts   # Real-time chat hook
    useTripData.ts       # Trip data fetching
  lib/
    tripchat-types.ts    # New type definitions
```

### Files to Modify
- `src/pages/Landing.tsx` - Rebrand to TripChat
- `src/pages/Auth.tsx` - Update branding
- `src/pages/Dashboard.tsx` - Complete redesign for chat-first UX
- `src/pages/CreateBoard.tsx` - Rename and simplify to 2 steps
- `src/App.tsx` - Update routes
- `src/components/ui/Logo.tsx` - Update to TripChat branding
- `src/index.css` - Adjust colors/theme if needed
- `src/contexts/AuthContext.tsx` - Keep as-is

### Files to Remove/Deprecate
- `src/pages/Board.tsx` (replaced by TripChat.tsx)
- `src/components/MembersTab.tsx` (replaced by panel components)

---

## Technical Considerations

### Security (RLS Policies)
- All chat messages protected by trip membership
- Only members can read/write messages
- Only members can create proposals
- Only owner/admin can pin final decision
- Invite acceptance adds user to trip_members

### Performance
- Paginate chat messages (load last 50, infinite scroll up)
- Lazy load proposal images
- Debounce typing indicators (future enhancement)
- Index on `messages.trip_id` and `messages.created_at`

### Mobile Experience
- Trip panel becomes slide-up drawer on mobile
- Chat composer stays fixed at bottom
- Proposal cards remain full-width
- Touch-friendly emoji reactions

---

## Implementation Order

1. Database migration (new tables, RLS policies)
2. Storage bucket creation
3. Type definitions update
4. Landing/Auth rebranding
5. Dashboard redesign
6. Create Trip flow (2-step wizard)
7. Join Trip page
8. Trip Chat room (core experience)
9. Chat messaging (text + system)
10. Proposal creation modal
11. Proposal message cards with voting
12. Trip panel sidebar
13. Proposal detail modal
14. Pin decision flow
15. Summary page
16. Real-time subscriptions
17. Image upload integration
18. Polish and testing

---

## Summary

This rebuild transforms the app from a structured board-based voting tool into a fluid, chat-first collaborative experience. The core innovation is embedding rich proposal cards directly into the chat stream, making trip planning feel like a natural conversation while maintaining the structured comparison and voting that makes group decisions work.

