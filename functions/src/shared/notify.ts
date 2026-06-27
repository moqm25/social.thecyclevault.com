import { db, FieldValue, COL } from './admin.js';

export type NotificationType =
  | 'comment_reply'
  | 'post_reply'
  | 'mention'
  | 'mod_action'
  | 'system';

/**
 * Internal notification creator (not client-callable). Suppresses self-notifies.
 * Source: docs/API_CONTRACT.md §6.
 */
export async function createNotification(input: {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  actorId?: string | null;
  actorUsername?: string | null;
}): Promise<void> {
  // Never notify a user about their own action.
  if (input.actorId && input.actorId === input.recipientId) return;

  await db.collection(COL.notifications).add({
    recipientId: input.recipientId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    actorId: input.actorId ?? null,
    actorUsername: input.actorUsername ?? null,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}
