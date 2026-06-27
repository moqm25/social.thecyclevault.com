import { useQuery } from "@tanstack/react-query";
import { getUserByUsername, listUserPosts, listUserComments } from "../../lib/firestore";

export function useUserProfile(username: string | undefined) {
	return useQuery({
		queryKey: ["user", username?.toLowerCase()],
		queryFn: () => getUserByUsername(username!),
		enabled: !!username,
	});
}

export function useUserPosts(uid: string | undefined) {
	return useQuery({
		queryKey: ["user-posts", uid],
		queryFn: () => listUserPosts(uid!),
		enabled: !!uid,
	});
}

export function useUserComments(uid: string | undefined) {
	return useQuery({
		queryKey: ["user-comments", uid],
		queryFn: () => listUserComments(uid!),
		enabled: !!uid,
	});
}
