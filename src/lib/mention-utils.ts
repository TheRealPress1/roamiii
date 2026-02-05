import type { Profile, TripMember } from './tripchat-types';
import { supabase } from '@/integrations/supabase/client';

// Regular expression to find @mentions in text
// Matches @username or @"full name with spaces"
const MENTION_REGEX = /@(?:"([^"]+)"|(\S+))/g;

export interface ParsedMention {
  fullMatch: string;
  name: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse @mentions from text
 */
export function parseMentions(text: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  let match;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const name = match[1] || match[2]; // quoted name or unquoted
    mentions.push({
      fullMatch: match[0],
      name,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Find matching members for mentions in text
 */
export function findMentionedMembers(
  text: string,
  members: TripMember[]
): TripMember[] {
  const mentions = parseMentions(text);
  const mentionedMembers: TripMember[] = [];

  for (const mention of mentions) {
    const lowerName = mention.name.toLowerCase();

    // Find member by name match (case insensitive)
    const member = members.find(m => {
      const memberName = m.profile?.name?.toLowerCase() || '';
      const memberEmail = m.profile?.email?.split('@')[0].toLowerCase() || '';

      return (
        memberName === lowerName ||
        memberEmail === lowerName ||
        memberName.startsWith(lowerName) ||
        memberEmail.startsWith(lowerName)
      );
    });

    if (member && !mentionedMembers.find(m => m.user_id === member.user_id)) {
      mentionedMembers.push(member);
    }
  }

  return mentionedMembers;
}

/**
 * Get autocomplete suggestions for @mentions
 */
export function getMentionSuggestions(
  searchText: string,
  members: TripMember[],
  currentUserId?: string
): TripMember[] {
  if (!searchText) {
    return members.filter(m => m.user_id !== currentUserId);
  }

  const lowerSearch = searchText.toLowerCase();

  return members
    .filter(m => m.user_id !== currentUserId)
    .filter(m => {
      const name = m.profile?.name?.toLowerCase() || '';
      const email = m.profile?.email?.split('@')[0].toLowerCase() || '';
      return name.includes(lowerSearch) || email.includes(lowerSearch);
    })
    .slice(0, 5);
}

/**
 * Replace @mention placeholders with formatted mentions
 */
export function formatMentions(text: string, members: TripMember[]): string {
  const mentions = parseMentions(text);
  let result = text;
  let offset = 0;

  for (const mention of mentions) {
    const member = members.find(m => {
      const name = m.profile?.name?.toLowerCase() || '';
      const email = m.profile?.email?.split('@')[0].toLowerCase() || '';
      const mentionLower = mention.name.toLowerCase();
      return name === mentionLower || email === mentionLower;
    });

    if (member) {
      const displayName = member.profile?.name || member.profile?.email?.split('@')[0] || 'Unknown';
      const replacement = `@${displayName}`;
      const start = mention.startIndex + offset;
      const end = mention.endIndex + offset;
      result = result.slice(0, start) + replacement + result.slice(end);
      offset += replacement.length - mention.fullMatch.length;
    }
  }

  return result;
}

/**
 * Create mention notifications for all mentioned users
 */
export async function createMentionNotifications(
  messageId: string,
  tripId: string,
  actorId: string,
  mentionedUserIds: string[],
  tripName: string
): Promise<void> {
  // Insert message mentions
  const mentionInserts = mentionedUserIds.map(userId => ({
    message_id: messageId,
    mentioned_user_id: userId,
  }));

  if (mentionInserts.length > 0) {
    await supabase.from('message_mentions').insert(mentionInserts);
  }

  // Get actor profile for notification
  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', actorId)
    .single();

  const actorName = actorProfile?.name || actorProfile?.email?.split('@')[0] || 'Someone';

  // Create notifications for each mentioned user
  const notifications = mentionedUserIds.map(userId => ({
    user_id: userId,
    trip_id: tripId,
    actor_id: actorId,
    type: 'mention' as const,
    title: `${actorName} mentioned you`,
    body: `in ${tripName}`,
    href: `/trips/${tripId}`,
  }));

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }
}

/**
 * Extract the current @mention being typed (for autocomplete)
 */
export function getCurrentMention(text: string, cursorPosition: number): {
  searchText: string;
  startIndex: number;
} | null {
  // Look backwards from cursor to find @
  const textBeforeCursor = text.slice(0, cursorPosition);
  const atIndex = textBeforeCursor.lastIndexOf('@');

  if (atIndex === -1) return null;

  // Check if there's a space between @ and cursor (if so, not in a mention)
  const textAfterAt = textBeforeCursor.slice(atIndex + 1);
  if (textAfterAt.includes(' ') && !textAfterAt.startsWith('"')) {
    return null;
  }

  return {
    searchText: textAfterAt,
    startIndex: atIndex,
  };
}

/**
 * Insert a mention at the current position
 */
export function insertMention(
  text: string,
  cursorPosition: number,
  member: TripMember
): { newText: string; newCursorPosition: number } {
  const mention = getCurrentMention(text, cursorPosition);
  if (!mention) {
    return { newText: text, newCursorPosition: cursorPosition };
  }

  const displayName = member.profile?.name || member.profile?.email?.split('@')[0] || 'Unknown';
  const needsQuotes = displayName.includes(' ');
  const mentionText = needsQuotes ? `@"${displayName}" ` : `@${displayName} `;

  const beforeMention = text.slice(0, mention.startIndex);
  const afterMention = text.slice(cursorPosition);

  const newText = beforeMention + mentionText + afterMention;
  const newCursorPosition = mention.startIndex + mentionText.length;

  return { newText, newCursorPosition };
}
