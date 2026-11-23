export type CalendarSyncStatus = "pending" | "sent" | "failed";

/** Whether the Google Calendar invitations of a published activity went out. */
export interface CalendarSync {
	/** The activity id: one record per activity. */
	id: string;
	status: CalendarSyncStatus;
	/** Short reason from Google when the invitations could not be sent. */
	error: string | null;
	updatedAt: string;
}
