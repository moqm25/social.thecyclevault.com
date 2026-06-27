import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  startAfter,
  where,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Community, Post, Comment } from '../types/models';

/**
 * Firestore read helpers. Public content is read directly from the client
 * (cheap, real-time-capable); all writes go through callables in lib/api.ts.
 * Every post/comment query filters status=='active' to satisfy security rules
 * (docs/SECURITY_RULES.md) and match the composite indexes (DATA_MODEL.md §14).
 */

export type FeedSort = 'hot' | 'new' | 'top';
const SORT_FIELD: Record<FeedSort, string> = {
  hot: 'hotRank',
  new: 'createdAt',
  top: 'score',
};

const PAGE_SIZE = 20;

/** Convert Firestore Timestamps to epoch millis so the app deals in plain numbers. */
function normalize<T>(data: DocumentData): T {
  const out: Record<string, unknown> = { ...data };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Timestamp) out[k] = v.toMillis();
  }
  return out as T;
}

export interface Page<T> {
  items: T[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
}

// ----------------------------- communities --------------------------------

export async function listCommunities(): Promise<Community[]> {
  const snap = await getDocs(collection(db, 'communities'));
  return snap.docs.map((d) => normalize<Community>({ slug: d.id, ...d.data() }));
}

export async function getCommunity(slug: string): Promise<Community | null> {
  const snap = await getDoc(doc(db, 'communities', slug));
  return snap.exists() ? normalize<Community>({ slug: snap.id, ...snap.data() }) : null;
}

// -------------------------------- posts -----------------------------------

export async function listPosts(opts: {
  communityId?: string;
  sort?: FeedSort;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}): Promise<Page<Post>> {
  const sort = opts.sort ?? 'hot';
  const constraints: QueryConstraint[] = [where('status', '==', 'active')];
  if (opts.communityId) constraints.push(where('communityId', '==', opts.communityId));
  // All three sorts are descending (hotRank / createdAt / score).
  constraints.push(orderBy(SORT_FIELD[sort], 'desc'));
  if (opts.cursor) constraints.push(startAfter(opts.cursor));
  constraints.push(qLimit(PAGE_SIZE));

  const snap = await getDocs(query(collection(db, 'posts'), ...constraints));
  const items = snap.docs.map((d) => normalize<Post>({ id: d.id, ...d.data() }));
  return { items, cursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null };
}

export async function getPost(id: string): Promise<Post | null> {
  const snap = await getDoc(doc(db, 'posts', id));
  return snap.exists() ? normalize<Post>({ id: snap.id, ...snap.data() }) : null;
}

// ------------------------------- comments ---------------------------------

export async function listComments(postId: string): Promise<Comment[]> {
  const snap = await getDocs(
    query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'asc'),
      qLimit(300),
    ),
  );
  return snap.docs.map((d) => normalize<Comment>({ id: d.id, ...d.data() }));
}

export async function listUserPosts(authorId: string): Promise<Post[]> {
  const snap = await getDocs(
    query(
      collection(db, 'posts'),
      where('authorId', '==', authorId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      qLimit(PAGE_SIZE),
    ),
  );
  return snap.docs.map((d) => normalize<Post>({ id: d.id, ...d.data() }));
}
