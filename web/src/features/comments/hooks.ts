import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createComment } from "../../lib/api";

/** Create a comment (top-level or reply) and refresh the thread. */
export function useCreateComment(postId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (vars: { body: string; parentCommentId?: string }) =>
			createComment({ postId, body: vars.body, parentCommentId: vars.parentCommentId }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["comments", postId] });
			qc.invalidateQueries({ queryKey: ["post", postId] });
		},
	});
}
