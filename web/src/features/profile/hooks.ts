import { useQuery } from "@tanstack/react-query";
import { getUserByUsername, listUserPosts, listUserComments } from "../../lib/firestore";

export function useUserProfile(username: string | undefined) {
	return useQuery({
		queryKey: ["user", username?.toLowerCase()],
		queryFn: () => getUserByUsername(username!),
		enabled: !!username,
	});
}

export function useUserPosts(uid: string | undefined, ownView = false) {
	return useQuery({
		queryKey: ["user-posts", uid, ownView ? "own" : "public"],
		queryFn: () => listUserPosts(uid!, ownView),
		enabled: !!uid,
	});
}

export function useUserComments(uid: string | undefined, ownView = false) {
	return useQuery({
		queryKey: ["user-comments", uid, ownView ? "own" : "public"],
		queryFn: () => listUserComments(uid!, ownView),
		enabled: !!uid,
	});
}
