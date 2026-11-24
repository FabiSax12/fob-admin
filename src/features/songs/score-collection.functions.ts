import { createServerFn } from "@tanstack/react-start";
import { requireMember } from "#/features/auth/auth.functions";
import { toActionResult } from "#/lib/action-result";
import { container } from "#/server/container";
import type { WizardProgress } from "./score-collection.service";

/** Null for a member without a part (the sonidista): they have no scores to upload. */
export const getMyScoreProgress = createServerFn({ method: "GET" }).handler(
	async (): Promise<WizardProgress | null> => {
		const member = await requireMember();
		if (!member.part) return null;
		return container.scoreCollection.progress(member);
	},
);

export const skipMyScore = createServerFn({ method: "POST" })
	.validator((songId: string) => songId)
	.handler(({ data: songId }) =>
		toActionResult(async () => {
			const member = await requireMember();
			await container.scoreCollection.skip(member, songId);
			return null;
		}),
	);

/** Checks the staged upload and only then stores it as the member's part PDF. */
export const confirmMyScoreUpload = createServerFn({ method: "POST" })
	.validator((songId: string) => songId)
	.handler(({ data: songId }) =>
		toActionResult(async () => {
			const member = await requireMember();
			return container.scoreCollection.confirmUpload(member, songId);
		}),
	);

/**
 * A presigned POST (url + form fields) to the member's staging key. The server picks the file
 * name from the member's part; the uploaded file name is ignored.
 */
export const requestMyScoreUpload = createServerFn({ method: "POST" })
	.validator((songId: string) => songId)
	.handler(({ data: songId }) =>
		toActionResult(async () => {
			const member = await requireMember();
			return container.scoreCollection.requestUpload(member, songId);
		}),
	);
