import type { Activity } from "#/features/activities/activities.types";
import type { Member } from "#/features/members/members.types";
import type { PdfStatusRow, PersonalPdf } from "./personal-pdf.types";

export const GENERATED_PDF_PREFIX = "generados/";

export function personalPdfId(activityId: string, email: string): string {
	return `${activityId}#${email}`;
}

export function personalPdfKey(activityId: string, email: string): string {
	return `${GENERATED_PDF_PREFIX}${activityId}/${email}.pdf`;
}

/** Only presentations have a setlist, and the sonidista has no part to read it in. */
export function receivesPersonalPdf(
	activity: Activity,
	member: Member,
): member is Member & { part: string } {
	return (
		activity.type === "presentacion" &&
		activity.attendees.includes(member.email) &&
		member.part !== null
	);
}

export function canDownload(activity: Activity, member: Member): boolean {
	return (
		activity.status === "published" && receivesPersonalPdf(activity, member)
	);
}

export function personalPdfFileName(title: string, part: string): string {
	return `${title} - ${part}.pdf`;
}

/** RFC 5987 form, so titles and parts with accents keep their name when downloaded. */
export function attachmentDisposition(fileName: string): string {
	const encodedFileName = encodeURIComponent(fileName).replace(
		/['()*]/g,
		(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
	);
	return `attachment; filename*=UTF-8''${encodedFileName}`;
}

export function pdfStatusRows(
	activity: Activity,
	members: Member[],
	pdfs: PersonalPdf[],
): PdfStatusRow[] {
	const statusById = new Map(pdfs.map((pdf) => [pdf.id, pdf.status]));
	return members
		.filter((member) => receivesPersonalPdf(activity, member))
		.map((member) => ({
			email: member.email,
			name: member.name,
			part: member.part,
			status: statusById.get(personalPdfId(activity.id, member.email)) ?? null,
		}));
}
