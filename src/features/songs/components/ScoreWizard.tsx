import { ChevronLeft, ChevronRight, SkipForward, Upload } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	confirmMyScoreUpload,
	requestMyScoreUpload,
	skipMyScore,
} from "../score-collection.functions";
import type { WizardProgress, WizardSong } from "../score-collection.service";
import { isPdfFileName } from "../score-storage";
import { getPartDownloadUrl } from "../songs.functions";
import { PdfFirstPage, type PdfSource } from "./PdfFirstPage";

const PDF_CONTENT_TYPE = "application/pdf";
const NOT_A_PDF_MESSAGE = "Solo se aceptan archivos PDF";
const MAX_SCORE_BYTES = 20 * 1024 * 1024;
const TOO_BIG_MESSAGE = "El PDF pesa más de 20 MB";
const UPLOAD_FAILED_MESSAGE = "No pudimos subir el archivo. Probá de nuevo.";
const SKIP_FAILED_MESSAGE =
	"No pudimos guardar que la saltaste. Probá de nuevo.";

type Busy = "uploading" | "skipping" | null;

function songStatus(song: WizardSong): { label: string; className: string } {
	if (song.hasPdf)
		return { label: "Ya está tu PDF", className: "text-fob-gold" };
	if (song.skipped)
		return { label: "La saltaste: no la tenés", className: "text-fob-subtle" };
	return { label: "Falta tu PDF", className: "text-fob-amber" };
}

async function putPdf(file: File, uploadUrl: string): Promise<void> {
	const response = await fetch(uploadUrl, {
		method: "PUT",
		headers: { "Content-Type": PDF_CONTENT_TYPE },
		body: file,
	});
	if (!response.ok)
		throw new Error(`S3 rejected the upload: ${response.status}`);
}

/** Signed URL of the member's stored PDF for the song, or null while loading or when there is none. */
function useStoredPdf(song: WizardSong, part: string): PdfSource | null {
	const [source, setSource] = useState<PdfSource | null>(null);

	useEffect(() => {
		setSource(null);
		if (!song.hasPdf) return;
		let isCancelled = false;
		getPartDownloadUrl({ data: { songId: song.songId, part } })
			.then((result) => {
				if (!isCancelled && result.ok) setSource({ url: result.data });
			})
			.catch(() => {});
		return () => {
			isCancelled = true;
		};
	}, [song.songId, song.hasPdf, part]);

	return source;
}

/**
 * Walks the repertoire song by song so a member uploads the PDF of their own part, or says
 * they do not have it. The server stores the file as `<part>.pdf`, whatever its name.
 */
export function ScoreWizard({ progress }: { progress: WizardProgress }) {
	const { part } = progress;
	const fileInput = useRef<HTMLInputElement>(null);
	const [songs, setSongs] = useState(progress.songs);
	const [index, setIndex] = useState(progress.startIndex);
	const [picked, setPicked] = useState<PdfSource | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState<Busy>(null);

	const song = songs[index];
	const storedPdf = useStoredPdf(song, part);
	const isLast = index === songs.length - 1;
	const done = songs.filter((s) => s.hasPdf).length;
	const skipped = songs.filter((s) => s.skipped).length;
	const status = songStatus(song);

	function goTo(next: number) {
		setIndex(Math.min(Math.max(next, 0), songs.length - 1));
		setPicked(null);
		setError(null);
	}

	function updateSong(fields: Partial<WizardSong>) {
		setSongs((current) =>
			current.map((s, i) => (i === index ? { ...s, ...fields } : s)),
		);
	}

	function pickFile(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		if (!isPdfFileName(file.name)) {
			setPicked(null);
			setError(NOT_A_PDF_MESSAGE);
			return;
		}
		if (file.size > MAX_SCORE_BYTES) {
			setPicked(null);
			setError(TOO_BIG_MESSAGE);
			return;
		}
		setError(null);
		setPicked({ file });
	}

	async function upload() {
		if (!picked || !("file" in picked)) return;
		setBusy("uploading");
		setError(null);
		try {
			const result = await requestMyScoreUpload({ data: song.songId });
			if (!result.ok) {
				setError(result.error);
				return;
			}
			await putPdf(picked.file, result.data.uploadUrl);
			const confirmed = await confirmMyScoreUpload({ data: song.songId });
			if (!confirmed.ok) {
				setError(confirmed.error);
				return;
			}
			updateSong({ hasPdf: true, skipped: false });
			if (isLast) setPicked(null);
			else goTo(index + 1);
		} catch {
			setError(UPLOAD_FAILED_MESSAGE);
		} finally {
			setBusy(null);
		}
	}

	async function skip() {
		setBusy("skipping");
		setError(null);
		try {
			const result = await skipMyScore({ data: song.songId });
			if (!result.ok) {
				setError(result.error);
				return;
			}
			updateSong({ skipped: true });
			if (!isLast) goTo(index + 1);
		} catch {
			setError(SKIP_FAILED_MESSAGE);
		} finally {
			setBusy(null);
		}
	}

	const preview = picked ?? storedPdf;

	return (
		<section aria-labelledby="wizard-song" className="flex flex-col gap-5">
			<p className="text-fob-subtle text-sm">
				Tu parte: <span className="text-fob-text">{part}</span> · {done} con PDF
				· {skipped} saltadas · {songs.length - done - skipped} pendientes
			</p>

			<div className="flex flex-col gap-1">
				<p className="instrument-label" aria-live="polite">
					Canción {index + 1} de {songs.length}
				</p>
				<h2 id="wizard-song" className="font-semibold text-2xl text-fob-text">
					{song.songName}
				</h2>
				<p className={`text-sm ${status.className}`}>{status.label}</p>
			</div>

			{preview && (
				<PdfFirstPage
					source={preview}
					label={`Primera página de ${picked ? "tu archivo" : "tu PDF actual"} para ${song.songName}`}
				/>
			)}
			{picked && "file" in picked && (
				<p className="text-fob-subtle text-sm">
					{picked.file.name} → se guarda como{" "}
					<span className="text-fob-text">{part}.pdf</span>
				</p>
			)}

			<input
				ref={fileInput}
				type="file"
				accept={`${PDF_CONTENT_TYPE},.pdf`}
				tabIndex={-1}
				aria-hidden
				className="sr-only"
				onChange={pickFile}
			/>

			<div className="flex flex-col gap-3">
				{picked ? (
					<>
						<Button
							type="button"
							className="h-11"
							disabled={busy !== null}
							onClick={() => void upload()}
						>
							<Upload aria-hidden />
							{busy === "uploading" ? "Subiendo…" : "Subir este PDF"}
						</Button>
						<Button
							type="button"
							variant="outline"
							className="h-11"
							disabled={busy !== null}
							onClick={() => fileInput.current?.click()}
						>
							Elegir otro archivo
						</Button>
					</>
				) : (
					<>
						<Button
							type="button"
							variant={song.hasPdf ? "outline" : "default"}
							className="h-11"
							disabled={busy !== null}
							onClick={() => fileInput.current?.click()}
						>
							<Upload aria-hidden />
							{song.hasPdf ? "Reemplazar PDF" : "Subir PDF"}
						</Button>
						{!song.hasPdf && (
							<Button
								type="button"
								variant="outline"
								className="h-11"
								disabled={busy !== null}
								onClick={() => void skip()}
							>
								<SkipForward aria-hidden />
								{busy === "skipping"
									? "Guardando…"
									: "Saltar porque no lo tengo"}
							</Button>
						)}
					</>
				)}
				{error && (
					<p role="alert" className="text-destructive text-sm">
						{error}
					</p>
				)}
			</div>

			<nav
				aria-label="Canciones"
				className="flex items-center justify-between gap-4 border-fob-700 border-t pt-4"
			>
				<Button
					type="button"
					variant="ghost"
					className="h-11"
					disabled={index === 0 || busy !== null}
					onClick={() => goTo(index - 1)}
				>
					<ChevronLeft aria-hidden />
					Anterior
				</Button>
				<Button
					type="button"
					variant="ghost"
					className="h-11"
					disabled={isLast || busy !== null}
					onClick={() => goTo(index + 1)}
				>
					Siguiente
					<ChevronRight aria-hidden />
				</Button>
			</nav>
		</section>
	);
}
