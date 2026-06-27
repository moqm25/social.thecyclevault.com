import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, COL } from "../shared/admin.js";
import { requireAuth } from "../shared/auth.js";
import { parseInput } from "../shared/validate.js";
import { markNotificationReadSchema } from "../shared/schemas.js";

/** markNotificationRead — recipient marks one or all of their notifications read. */
export const markNotificationRead = onCall(async (request) => {
	const auth = requireAuth(request);
	const input = parseInput(markNotificationReadSchema, request.data);

	if ("all" in input) {
		const unread = await db.collection(COL.notifications).where("recipientId", "==", auth.uid).where("read", "==", false).limit(400).get();
		const batch = db.batch();
		unread.forEach((d) => batch.update(d.ref, { read: true }));
		await batch.commit();
		return { ok: true as const };
	}

	const ref = db.collection(COL.notifications).doc(input.notificationId);
	const snap = await ref.get();
	if (!snap.exists) throw new HttpsError("not-found", "Notification not found.");
	if ((snap.data()?.recipientId as string) !== auth.uid) {
		throw new HttpsError("permission-denied", "Not your notification.");
	}
	await ref.update({ read: true });
	return { ok: true as const };
});
