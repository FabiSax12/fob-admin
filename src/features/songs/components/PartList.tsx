import { useRouter } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useState } from "react";
import { ConfirmButton } from "#/components/ConfirmButton";
import { deletePart, getPartDownloadUrl } from "../songs.functions";

const OPEN_FAILED_MESSAGE = "No pudimos abrir el PDF. Probá de nuevo.";
const DELETE_FAILED_MESSAGE = "No pudimos eliminar la parte. Probá de nuevo.";

interface PartListProps {
	songId: string;
	parts: string[];
	canDelete: boolean;
}

export function PartList({ songId, parts, canDelete }: PartListProps) {
	if (parts.length === 0) {
		return (
			<p className="text-fob-subtle">Esta canción todavía no tiene partes.</p>
		);
	}

	return (
		<ul className="border-fob-700 border-t">
			{parts.map((part) => (
				<PartRow key={part} songId={songId} part={part} canDelete={canDelete} />
			))}
		</ul>
	);
}

/**
 * The tab opens before the signed URL arrives because mobile browsers block
 * pop-ups that are not opened right inside the tap.
 */
async function openPartPdf(
	songId: string,
	part: string,
): Promise<string | null> {
	const pdfTab = window.open("", "_blank");
	if (pdfTab) pdfTab.opener = null;
	try {
		const result = await getPartDownloadUrl({ data: { songId, part } });
		if (!result.ok) {
			pdfTab?.close();
			return result.error;
		}
		if (pdfTab) pdfTab.location.href = result.data;
		else window.location.assign(result.data);
		return null;
	} catch {
		pdfTab?.close();
		return OPEN_FAILED_MESSAGE;
	}
}

function PartRow({
	songId,
	part,
	canDelete,
}: {
	songId: string;
	part: string;
	canDelete: boolean;
}) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);

	async function open() {
		setError(await openPartPdf(songId, part));
	}

	async function remove() {
		setError(null);
		try {
			const result = await deletePart({ data: { songId, part } });
			if (!result.ok) {
				setError(result.error);
				return;
			}
			await router.invalidate();
		} catch {
			setError(DELETE_FAILED_MESSAGE);
		}
	}

	return (
		<li className="flex flex-col gap-1 border-fob-700 border-b py-3">
			<button
				type="button"
				onClick={open}
				className="group flex min-h-11 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fob-amber/50"
			>
				<FileText aria-hidden className="size-5 shrink-0 text-fob-amber" />
				<span className="min-w-0 flex-1 truncate text-fob-text transition-colors group-hover:text-fob-gold">
					{part}
				</span>
				<span className="instrument-label">Ver PDF</span>
			</button>
			{canDelete && (
				<ConfirmButton
					label="Eliminar parte"
					question={`¿Eliminar el PDF de ${part}?`}
					onConfirm={remove}
				/>
			)}
			{error && (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}
		</li>
	);
}
