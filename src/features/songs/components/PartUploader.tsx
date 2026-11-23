import { useRouter } from "@tanstack/react-router";
import { Upload, X } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { isPdfFileName, suggestPart } from "../score-storage";
import { type PartUpload, requestPartUploads } from "../songs.functions";

const PDF_CONTENT_TYPE = "application/pdf";
const UPLOAD_FAILED_MESSAGE = "No pudimos subir el archivo. Probá de nuevo.";
const NOT_A_PDF_MESSAGE = "Solo se aceptan archivos PDF";
const DUPLICATE_PART_MESSAGE = "Otro archivo ya va a esta parte";
const INSTRUCTIONS =
	"Elegí los PDF con el nombre que tengan y después la parte de cada uno. Si el nombre se parece a una parte, ya viene elegida.";
const NO_PARTS_MESSAGE =
	"Todavía no hay partes. Asigná una parte a cada miembro para poder subir sus partituras.";

type UploadStatus = "choosing" | "uploading" | "done" | "failed";

const STATUS_LABELS: Record<UploadStatus, string> = {
	choosing: "Elegí la parte",
	uploading: "Subiendo",
	done: "Listo",
	failed: "Error",
};

const STATUS_CLASSES: Record<UploadStatus, string> = {
	choosing: "text-fob-subtle",
	uploading: "text-fob-amber",
	done: "text-fob-gold",
	failed: "text-destructive",
};

interface FileUpload {
	id: string;
	file: File;
	part: string | null;
	status: UploadStatus;
	error: string | null;
}

function toFileUpload(
	file: File,
	index: number,
	bandParts: string[],
): FileUpload {
	const id = `${index}-${file.name}`;
	if (!isPdfFileName(file.name))
		return {
			id,
			file,
			part: null,
			status: "failed",
			error: NOT_A_PDF_MESSAGE,
		};
	const part = suggestPart(file.name, bandParts);
	return { id, file, part, status: "choosing", error: null };
}

/** Parts chosen for more than one pending file; each part keeps a single PDF. */
function duplicatedParts(uploads: FileUpload[]): Set<string> {
	const seen = new Set<string>();
	const duplicated = new Set<string>();
	for (const { part, status } of uploads) {
		if (status !== "choosing" || part === null) continue;
		if (seen.has(part)) duplicated.add(part);
		seen.add(part);
	}
	return duplicated;
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

/**
 * Director tool: uploads PDFs with any file name, each one for the part the director picks.
 * A file for a part that already exists replaces it.
 */
export function PartUploader({
	songId,
	bandParts,
}: {
	songId: string;
	bandParts: string[];
}) {
	const router = useRouter();
	const fileInput = useRef<HTMLInputElement>(null);
	const [uploads, setUploads] = useState<FileUpload[]>([]);
	const [isUploading, setIsUploading] = useState(false);

	const pending = uploads.filter((upload) => upload.status === "choosing");
	const duplicated = duplicatedParts(uploads);
	const canUpload =
		!isUploading &&
		pending.length > 0 &&
		pending.every((upload) => upload.part !== null) &&
		duplicated.size === 0;

	function updateUpload(id: string, fields: Partial<FileUpload>) {
		setUploads((current) =>
			current.map((upload) =>
				upload.id === id ? { ...upload, ...fields } : upload,
			),
		);
	}

	function removeUpload(id: string) {
		setUploads((current) => current.filter((upload) => upload.id !== id));
	}

	function failUploads(failed: FileUpload[], error: string) {
		for (const upload of failed) {
			updateUpload(upload.id, { status: "failed", error });
		}
	}

	async function sendFile(upload: FileUpload, uploadUrl: string) {
		updateUpload(upload.id, { status: "uploading" });
		try {
			await putPdf(upload.file, uploadUrl);
			updateUpload(upload.id, { status: "done" });
		} catch {
			updateUpload(upload.id, {
				status: "failed",
				error: UPLOAD_FAILED_MESSAGE,
			});
		}
	}

	async function requestUploadUrls(
		chosen: FileUpload[],
	): Promise<PartUpload[] | null> {
		try {
			const result = await requestPartUploads({
				data: {
					songId,
					uploads: chosen.map((upload) => ({
						fileName: upload.file.name,
						part: upload.part ?? "",
					})),
				},
			});
			if (result.ok) return result.data;
			failUploads(chosen, result.error);
		} catch {
			failUploads(chosen, UPLOAD_FAILED_MESSAGE);
		}
		return null;
	}

	async function uploadChosen() {
		const chosen = pending;
		setIsUploading(true);
		const partUploads = await requestUploadUrls(chosen);
		if (partUploads) {
			await Promise.all(
				partUploads.map((partUpload, index) =>
					sendFile(chosen[index], partUpload.uploadUrl),
				),
			);
			await router.invalidate();
		}
		setIsUploading(false);
	}

	function pickFiles(event: ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (files.length === 0) return;
		setUploads(
			files.map((file, index) => toFileUpload(file, index, bandParts)),
		);
	}

	return (
		<section
			aria-labelledby="part-uploader-title"
			className="flex flex-col gap-4"
		>
			<h2 id="part-uploader-title" className="instrument-label">
				Subir partes
			</h2>
			{bandParts.length === 0 ? (
				<p className="max-w-[42ch] text-fob-subtle text-sm">
					{NO_PARTS_MESSAGE}
				</p>
			) : (
				<>
					<p className="max-w-[42ch] text-fob-subtle text-sm">{INSTRUCTIONS}</p>
					<input
						ref={fileInput}
						type="file"
						accept={`${PDF_CONTENT_TYPE},.pdf`}
						multiple
						tabIndex={-1}
						aria-hidden
						className="sr-only"
						onChange={pickFiles}
					/>
					<Button
						type="button"
						variant={pending.length > 0 ? "outline" : "default"}
						className="h-11 self-start"
						disabled={isUploading}
						onClick={() => fileInput.current?.click()}
					>
						<Upload aria-hidden />
						Elegir PDF
					</Button>
				</>
			)}
			{uploads.length > 0 && (
				<ul aria-live="polite" className="flex flex-col gap-3">
					{uploads.map((upload) => (
						<UploadRow
							key={upload.id}
							upload={upload}
							bandParts={bandParts}
							isDuplicated={upload.part !== null && duplicated.has(upload.part)}
							disabled={isUploading}
							onChoosePart={(part) => updateUpload(upload.id, { part })}
							onRemove={() => removeUpload(upload.id)}
						/>
					))}
				</ul>
			)}
			{pending.length > 0 && (
				<Button
					type="button"
					className="h-11 self-start"
					disabled={!canUpload}
					onClick={() => void uploadChosen()}
				>
					{isUploading
						? "Subiendo…"
						: `Subir ${pending.length} ${pending.length === 1 ? "partitura" : "partituras"}`}
				</Button>
			)}
		</section>
	);
}

function UploadRow({
	upload,
	bandParts,
	isDuplicated,
	disabled,
	onChoosePart,
	onRemove,
}: {
	upload: FileUpload;
	bandParts: string[];
	isDuplicated: boolean;
	disabled: boolean;
	onChoosePart: (part: string) => void;
	onRemove: () => void;
}) {
	const selectId = `part-for-${upload.id}`;
	const isChoosing = upload.status === "choosing";
	const error = upload.error ?? (isDuplicated ? DUPLICATE_PART_MESSAGE : null);

	return (
		<li className="flex flex-col gap-2 border-fob-700 border-b pb-3 text-sm">
			<div className="flex items-center justify-between gap-4">
				<label htmlFor={selectId} className="min-w-0 truncate text-fob-text">
					{upload.file.name}
				</label>
				<div className="flex shrink-0 items-center gap-1">
					<span className={STATUS_CLASSES[upload.status]}>
						{isChoosing && upload.part ? "" : STATUS_LABELS[upload.status]}
					</span>
					{isChoosing && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-11"
							aria-label={`Quitar ${upload.file.name}`}
							disabled={disabled}
							onClick={onRemove}
						>
							<X aria-hidden />
						</Button>
					)}
				</div>
			</div>
			{isChoosing && (
				<Select
					value={upload.part ?? ""}
					onValueChange={onChoosePart}
					disabled={disabled}
				>
					<SelectTrigger
						id={selectId}
						aria-invalid={isDuplicated}
						className="h-11 w-full"
					>
						<SelectValue placeholder="¿De qué parte es?" />
					</SelectTrigger>
					<SelectContent>
						{bandParts.map((part) => (
							<SelectItem key={part} value={part} className="min-h-11">
								{part}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
			{!isChoosing && upload.part && (
				<p className="text-fob-subtle">→ {upload.part}</p>
			)}
			{error && <p className="text-destructive">{error}</p>}
		</li>
	);
}
