export type PersonalPdfStatus = "pending" | "ready" | "failed";

/** The setlist PDF built for one attendee of a presentation, in the part that attendee plays. */
export interface PersonalPdf {
	/** `<activityId>#<email>` */
	id: string;
	activityId: string;
	email: string;
	part: string;
	status: PersonalPdfStatus;
	/** S3 key of the generated PDF, set once it is ready. */
	key: string | null;
	updatedAt: string;
	/** Short reason shown in the logs when the PDF could not be built. */
	error: string | null;
}

export type MyPdf =
	| { status: "pending" | "failed" }
	| { status: "ready"; downloadUrl: string };

export interface PdfStatusRow {
	email: string;
	name: string;
	part: string;
	/** Null when no PDF was requested yet, for example an activity published before PDFs existed. */
	status: PersonalPdfStatus | null;
}

export interface PublishEffectsEvent {
	activityId: string;
}
