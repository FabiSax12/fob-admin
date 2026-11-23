import type { Activity } from "../activities.types";

/**
 * Where the attendee's "Descargar mi PDF" link goes once personal PDFs exist (T8).
 * Renders nothing until then, so the detail page already reserves its place.
 */
export function PersonalPdfSlot(_props: { activity: Activity }) {
	return null;
}
