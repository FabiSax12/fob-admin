import { createServerFn } from "@tanstack/react-start";
import { requireDirector, requireMember } from "#/features/auth/auth.functions";
import { container } from "#/server/container";
import { DomainError } from "#/shared/errors";
import {
	canDownload,
	pdfStatusRows,
	personalPdfFileName,
	personalPdfId,
} from "./personal-pdf";
import type { MyPdf, PdfStatusRow, PersonalPdf } from "./personal-pdf.types";

async function findVisibleActivity(activityId: string) {
	const member = await requireMember();
	try {
		return {
			member,
			activity: await container.activities.getFor(member, activityId),
		};
	} catch (error) {
		if (error instanceof DomainError && error.code === "not_found") return null;
		throw error;
	}
}

/**
 * The signed-in member's PDF for a presentation, with a fresh 15-minute download link once ready.
 * Null when the member gets no PDF: not called, no part, not a published presentation.
 */
export const getMyPdf = createServerFn({ method: "GET" })
	.validator((activityId: string) => activityId)
	.handler(async ({ data: activityId }): Promise<MyPdf | null> => {
		const visible = await findVisibleActivity(activityId);
		if (!visible || !canDownload(visible.activity, visible.member)) return null;

		const { activity, member } = visible;
		const pdf = await container.personalPdfs.get(
			personalPdfId(activity.id, member.email),
		);
		if (!pdf) return null;
		if (pdf.status !== "ready") return { status: pdf.status };
		if (!pdf.key) return { status: "failed" };

		return {
			status: "ready",
			downloadUrl: await container.personalPdfStorage.createDownloadUrl(
				pdf.key,
				personalPdfFileName(activity.title, pdf.part),
			),
		};
	});

/** Director only: how far the PDF of each called musician is. */
export const getPdfStatuses = createServerFn({ method: "GET" })
	.validator((activityId: string) => activityId)
	.handler(async ({ data: activityId }): Promise<PdfStatusRow[]> => {
		const director = await requireDirector();
		const activity = await container.activities.getFor(director, activityId);
		const members = await container.members.list();
		const pdfs = await Promise.all(
			activity.attendees.map((email) =>
				container.personalPdfs.get(personalPdfId(activity.id, email)),
			),
		);
		return pdfStatusRows(
			activity,
			members,
			pdfs.filter((pdf): pdf is PersonalPdf => pdf !== null),
		);
	});
