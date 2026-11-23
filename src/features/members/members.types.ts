import { z } from "zod";
import { fileSafeName, googleEmail, requiredName } from "#/shared/schemas";

export const ROLES = ["director", "musician", "sound"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
	director: "Director",
	musician: "Músico",
	sound: "Sonidista",
};

export interface Member {
	/** Google account email, lowercase. It is the member's identity. */
	email: string;
	name: string;
	role: Role;
	/** Part name, which is also the PDF file name in each song folder. Null for the sonidista. */
	part: string | null;
	sectionIds: string[];
}

export const memberInputSchema = z
	.object({
		email: googleEmail,
		name: requiredName,
		role: z.enum(ROLES, { error: "Elegí un rol" }),
		part: z
			.string()
			.optional()
			.nullable()
			.transform((value) => value?.trim() || null)
			.pipe(fileSafeName.nullable()),
		sectionIds: z.array(z.string()).default([]),
	})
	.superRefine((member, ctx) => {
		if (member.role !== "sound" && !member.part) {
			ctx.addIssue({
				code: "custom",
				path: ["part"],
				message: "Asigná la parte que toca (por ejemplo, Trompeta 1)",
			});
		}
	})
	.transform(
		(member): Member => ({
			...member,
			part: member.role === "sound" ? null : member.part,
		}),
	);

export type MemberInput = z.input<typeof memberInputSchema>;
