import { useQuery } from "@tanstack/react-query";
import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { getMyPdf } from "#/features/publishing/publishing.functions";
import type { Activity } from "../activities.types";

const PENDING_POLL_INTERVAL_MS = 5000;
const OPEN_FAILED_MESSAGE = "No pudimos abrir tu PDF. Probá de nuevo.";

/** The attendee's own setlist PDF. Renders nothing for anyone who gets no PDF. */
export function PersonalPdfSlot({ activity }: { activity: Activity }) {
	const hasPersonalPdfs =
		activity.type === "presentacion" && activity.status === "published";
	const { data: myPdf } = useQuery({
		queryKey: ["my-pdf", activity.id, activity.updatedAt],
		queryFn: () => getMyPdf({ data: activity.id }),
		enabled: hasPersonalPdfs,
		refetchInterval: (query) =>
			query.state.data?.status === "pending" ? PENDING_POLL_INTERVAL_MS : false,
	});

	if (!hasPersonalPdfs || !myPdf) return null;

	return (
		<section aria-label="Mi PDF" className="mt-8">
			{myPdf.status === "pending" && (
				<output className="flex items-center gap-2 text-fob-subtle [&_svg]:size-5 [&_svg]:text-fob-amber">
					<LoaderCircle aria-hidden className="animate-spin" />
					Estamos armando tu PDF…
				</output>
			)}
			{myPdf.status === "ready" && <DownloadButton activityId={activity.id} />}
			{myPdf.status === "failed" && (
				<p role="alert" className="text-destructive">
					No pudimos generar tu PDF. Avisale al director.
				</p>
			)}
		</section>
	);
}

/**
 * The tab opens before the signed URL arrives because mobile browsers block
 * pop-ups that are not opened right inside the tap. The URL is requested on
 * every tap so it never expires while the page stays open.
 */
async function openMyPdf(activityId: string): Promise<string | null> {
	const pdfTab = window.open("", "_blank");
	if (pdfTab) pdfTab.opener = null;
	try {
		const myPdf = await getMyPdf({ data: activityId });
		if (myPdf?.status !== "ready") {
			pdfTab?.close();
			return OPEN_FAILED_MESSAGE;
		}
		if (pdfTab) pdfTab.location.href = myPdf.downloadUrl;
		else window.location.assign(myPdf.downloadUrl);
		return null;
	} catch {
		pdfTab?.close();
		return OPEN_FAILED_MESSAGE;
	}
}

function DownloadButton({ activityId }: { activityId: string }) {
	const [error, setError] = useState<string | null>(null);
	const [isOpening, setIsOpening] = useState(false);

	async function download() {
		setIsOpening(true);
		setError(await openMyPdf(activityId));
		setIsOpening(false);
	}

	return (
		<div className="flex flex-col gap-2">
			<Button
				type="button"
				className="h-11 self-start px-8"
				disabled={isOpening}
				onClick={download}
			>
				<Download aria-hidden />
				Descargar mi PDF
			</Button>
			{error && (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}
		</div>
	);
}
