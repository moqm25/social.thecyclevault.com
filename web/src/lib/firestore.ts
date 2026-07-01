import {
	collection,
	doc,
	getDoc,
	getDocs,
	limit as qLimit,
	orderBy,
	query,
	startAfter,
	updateDoc,
	serverTimestamp,
	where,
	Timestamp,
	type DocumentData,
	type QueryDocumentSnapshot,
	type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
	Community,
	Post,
	Comment,
	UserProfile,
	AppNotification,
	Report,
	ModerationQueueItem,
	SponsoredProduct,
	ProductCategory,
	Announcement,
	UserModeration,
} from "../types/models";

/**
 * Firestore read helpers. Public content is read directly from the client
 * (cheap, real-time-capable); all writes go through callables in lib/api.ts.
 * Every post/comment query filters status=='active' to satisfy security rules
 * (docs/SECURITY_RULES.md) and match the composite indexes (DATA_MODEL.md §14).
 */

export type FeedSort = "hot" | "new" | "top";
const SORT_FIELD: Record<FeedSort, string> = {
	hot: "hotRank",
	new: "createdAt",
	top: "score",
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
	const snap = await getDocs(collection(db, "communities"));
	return snap.docs.map((d) => normalize<Community>({ slug: d.id, ...d.data() }));
}

export async function getCommunity(slug: string): Promise<Community | null> {
	const snap = await getDoc(doc(db, "communities", slug));
	return snap.exists() ? normalize<Community>({ slug: snap.id, ...snap.data() }) : null;
}

// -------------------------------- posts -----------------------------------

export async function listPosts(opts: {
	communityId?: string;
	sort?: FeedSort;
	cursor?: QueryDocumentSnapshot<DocumentData> | null;
}): Promise<Page<Post>> {
	const sort = opts.sort ?? "hot";
	const constraints: QueryConstraint[] = [where("status", "==", "active")];
	if (opts.communityId) constraints.push(where("communityId", "==", opts.communityId));
	// All three sorts are descending (hotRank / createdAt / score).
	constraints.push(orderBy(SORT_FIELD[sort], "desc"));
	if (opts.cursor) constraints.push(startAfter(opts.cursor));
	constraints.push(qLimit(PAGE_SIZE));

	const snap = await getDocs(query(collection(db, "posts"), ...constraints));
	const items = snap.docs.map((d) => normalize<Post>({ id: d.id, ...d.data() }));
	return { items, cursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null };
}

export async function getPost(id: string): Promise<Post | null> {
	const snap = await getDoc(doc(db, "posts", id));
	return snap.exists() ? normalize<Post>({ id: snap.id, ...snap.data() }) : null;
}

export async function getComment(id: string): Promise<Comment | null> {
	const snap = await getDoc(doc(db, "comments", id));
	return snap.exists() ? normalize<Comment>({ id: snap.id, ...snap.data() }) : null;
}

// ------------------------------- comments ---------------------------------

export async function listComments(postId: string, includeHidden = false): Promise<Comment[]> {
	// Admin view (includeHidden) fetches every status so removed/deleted comments
	// can be shown (marked) inline. Rules still gate this to mods/admins. The
	// regular path filters to active and is index-backed (status+createdAt).
	const constraints: QueryConstraint[] = includeHidden
		? [where("postId", "==", postId), orderBy("createdAt", "asc"), qLimit(300)]
		: [where("postId", "==", postId), where("status", "==", "active"), orderBy("createdAt", "asc"), qLimit(300)];
	const snap = await getDocs(query(collection(db, "comments"), ...constraints));
	return snap.docs.map((d) => normalize<Comment>({ id: d.id, ...d.data() }));
}

export async function listUserPosts(authorId: string, ownView = false): Promise<Post[]> {
	// On your OWN profile you can see everything you wrote (incl. held/removed) so
	// your history isn't a mystery; others see only active. The `in` filter reuses
	// the (authorId, status, createdAt) index, so no extra index is required.
	const statusFilter = ownView
		? where("status", "in", ["active", "pending", "removed", "deleted", "locked"])
		: where("status", "==", "active");
	const snap = await getDocs(
		query(collection(db, "posts"), where("authorId", "==", authorId), statusFilter, orderBy("createdAt", "desc"), qLimit(PAGE_SIZE)),
	);
	return snap.docs.map((d) => normalize<Post>({ id: d.id, ...d.data() }));
}

export async function listUserComments(authorId: string, ownView = false): Promise<Comment[]> {
	const statusFilter = ownView
		? where("status", "in", ["active", "pending", "removed", "deleted"])
		: where("status", "==", "active");
	const snap = await getDocs(
		query(collection(db, "comments"), where("authorId", "==", authorId), statusFilter, orderBy("createdAt", "desc"), qLimit(PAGE_SIZE)),
	);
	return snap.docs.map((d) => normalize<Comment>({ id: d.id, ...d.data() }));
}

// ------------------------------- users ------------------------------------

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
	const snap = await getDocs(query(collection(db, "users"), where("usernameLower", "==", username.toLowerCase()), qLimit(1)));
	if (snap.empty) return null;
	const d = snap.docs[0];
	return normalize<UserProfile>({ uid: d.id, ...d.data() });
}

/**
 * Update the signed-in user's own editable profile fields. Only displayName,
 * avatarUrl, and bio are writable by the client (rules enforce this allow-list);
 * updatedAt is set server-side.
 */
export async function updateMyProfile(uid: string, patch: { displayName?: string | null; bio?: string }): Promise<void> {
	await updateDoc(doc(db, "users", uid), {
		...patch,
		updatedAt: serverTimestamp(),
	});
}

// --------------------------- notifications --------------------------------

export async function listMyNotifications(uid: string): Promise<AppNotification[]> {
	const snap = await getDocs(query(collection(db, "notifications"), where("recipientId", "==", uid), orderBy("createdAt", "desc"), qLimit(50)));
	return snap.docs.map((d) => normalize<AppNotification>({ id: d.id, ...d.data() }));
}

// ----------------------------- moderation ---------------------------------

/** Open/in-review reports for the mod queue (mods/admins only by rules). */
export async function listOpenReports(): Promise<Report[]> {
	const snap = await getDocs(
		query(collection(db, "reports"), where("status", "in", ["open", "reviewing"]), orderBy("createdAt", "desc"), qLimit(50)),
	);
	return snap.docs.map((d) => normalize<Report>({ id: d.id, ...d.data() }));
}

/** Content held for human review (moderationQueue.state == awaiting_human). */
export async function listAwaitingReview(): Promise<ModerationQueueItem[]> {
	const snap = await getDocs(
		query(collection(db, "moderationQueue"), where("state", "==", "awaiting_human"), orderBy("createdAt", "desc"), qLimit(50)),
	);
	return snap.docs.map((d) => normalize<ModerationQueueItem>({ id: d.id, ...d.data() }));
}

/** The full moderation stream — every item with its AI + human decisions. */
export async function listModerationStream(): Promise<ModerationQueueItem[]> {
	const snap = await getDocs(query(collection(db, "moderationQueue"), orderBy("createdAt", "desc"), qLimit(50)));
	return snap.docs.map((d) => normalize<ModerationQueueItem>({ id: d.id, ...d.data() }));
}

// -------------------------- sponsored products ----------------------------

/**
 * Active products for the public Shop / in-feed placement. Optional category
 * filter. Reads are allowed by rules only where active == true.
 */
export async function listSponsoredProducts(category?: ProductCategory): Promise<SponsoredProduct[]> {
	const constraints: QueryConstraint[] = [where("active", "==", true)];
	if (category) constraints.push(where("category", "==", category));
	constraints.push(orderBy("createdAt", "desc"), qLimit(60));
	const snap = await getDocs(query(collection(db, "sponsoredProducts"), ...constraints));
	return snap.docs.map((d) => normalize<SponsoredProduct>({ id: d.id, ...d.data() }));
}

/** Admin view: ALL products incl. paused (requires mod/admin per rules). */
export async function listAllSponsoredProducts(): Promise<SponsoredProduct[]> {
	const snap = await getDocs(query(collection(db, "sponsoredProducts"), orderBy("createdAt", "desc"), qLimit(100)));
	return snap.docs.map((d) => normalize<SponsoredProduct>({ id: d.id, ...d.data() }));
}

/** The current page-wide announcement banner, if any (settings/global). */
export async function getAnnouncement(): Promise<Announcement | null> {
	const snap = await getDoc(doc(db, "settings", "global"));
	if (!snap.exists()) return null;
	const ann = (snap.data() as DocumentData).announcement;
	if (!ann) return null;
	return normalize<Announcement>(ann);
}

// --------------------------- user moderation ------------------------------

/** Accounts flagged for admin review after repeated strikes (mod/admin only). */
export async function listAccountsNeedingReview(): Promise<UserModeration[]> {
	const snap = await getDocs(
		query(collection(db, "userModeration"), where("needsAdminReview", "==", true), qLimit(50)),
	);
	return snap.docs.map((d) => normalize<UserModeration>({ uid: d.id, ...d.data() }));
}

/** A single user's private moderation record (strike counts), or null. */
export async function getUserModeration(uid: string): Promise<UserModeration | null> {
	const snap = await getDoc(doc(db, "userModeration", uid));
	return snap.exists() ? normalize<UserModeration>({ uid: snap.id, ...snap.data() }) : null;
}

// ----------------------- removed / deleted content ------------------------

/** Recently removed-or-deleted posts (mod/admin only). For the admin dashboard. */
export async function listRemovedPosts(): Promise<Post[]> {
	const snap = await getDocs(
		query(collection(db, "posts"), where("status", "in", ["removed", "deleted"]), orderBy("updatedAt", "desc"), qLimit(30)),
	);
	return snap.docs.map((d) => normalize<Post>({ id: d.id, ...d.data() }));
}

/** Recently removed-or-deleted comments (mod/admin only). For the admin dashboard. */
export async function listRemovedComments(): Promise<Comment[]> {
	const snap = await getDocs(
		query(collection(db, "comments"), where("status", "in", ["removed", "deleted"]), orderBy("updatedAt", "desc"), qLimit(30)),
	);
	return snap.docs.map((d) => normalize<Comment>({ id: d.id, ...d.data() }));
}
