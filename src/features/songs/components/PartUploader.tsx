import { useRouter } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { DomainError } from "#/shared/errors";
import { partNameFromFileName } from "../score-storage";
import { type PartUpload, requestPartUploads } from "../songs.functions";

const PDF_CONTENT_TYPE = "application/pdf";
const UPLOAD_FAILED_MESSAGE = "No pudimos subir el archivo. Probá de nuevo.";
const INSTRUCTIONS =
	"Subí los PDF de cada parte. El nombre del archivo tiene que ser la parte, por ejemplo Trompeta 1.pdf";

type UploadStatus = "pending" | "uploading" | "done" | "failed";

const STATUS_LABELS: Record<UploadStatus, string> = {
	pending: "Pendiente",
	uploading: "Subiendo",
	done: "Listo",
	failed: "Error",
};

const STATUS_CLASSES: Record<UploadStatus, string> = {
	pending: "text-fob-subtle",
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

function toFileUpload(file: File, index: number): FileUpload {
	const id = `${index}-${file.name}`;
	try {
		const part = partNameFromFileName(file.name);
		return { id, file, part, status: "pending", error: null };
	} catch (error) {
		const message =
			error instanceof DomainError ? error.message : UPLOAD_FAILED_MESSAGE;
		return { id, file, part: null, status: "failed", error: message };
	}
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

/** Director tool: uploads one PDF per part. A file for a part that already exists replaces it. */
export function PartUploader({ songId }: { songId: string }) {
	const router = useRouter();
	const fileInput = useRef<HTMLInputElement>(null);
	const [uploads, setUploads] = useState<FileUpload[]>([]);
	const [isUploading, setIsUploading] = useState(false);

	function updateUpload(id: string, fields: Partial<FileUpload>) {
		setUploads((current) =>
			current.map((upload) =>
				upload.id === id ? { ...upload, ...fields } : upload,
			),
		);
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
		validUploads: FileUpload[],
	): Promise<PartUpload[] | null> {
		try {
			const result = await requestPartUploads({
				data: {
					songId,
					fileNames: validUploads.map((upload) => upload.file.name),
				},
			});
			if (result.ok) return result.data;
			failUploads(validUploads, result.error);
		} catch {
			failUploads(validUploads, UPLOAD_FAILED_MESSAGE);
		}
		return null;
	}

	async function uploadFiles(files: File[]) {
		const selected = files.map(toFileUpload);
		setUploads(selected);
		const validUploads = selected.filter((upload) => upload.part !== null);
		if (validUploads.length === 0) return;

		setIsUploading(true);
		const partUploads = await requestUploadUrls(validUploads);
		if (partUploads) {
			await Promise.all(
				partUploads.map((partUpload, index) =>
					sendFile(validUploads[index], partUpload.uploadUrl),
				),
			);
			await router.invalidate();
		}
		setIsUploading(false);
	}

	function pickFiles(event: ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (files.length > 0) void uploadFiles(files);
	}

	return (
		<section
			aria-labelledby="part-uploader-title"
			className="flex flex-col gap-4"
		>
			<h2 id="part-uploader-title" className="instrument-label">
				Subir partes
			</h2>
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
				className="h-11 self-start"
				disabled={isUploading}
				onClick={() => fileInput.current?.click()}
			>
				<Upload aria-hidden />
				{isUploading ? "Subiendo…" : "Elegir PDF"}
			</Button>
			{uploads.length > 0 && (
				<ul aria-live="polite" className="flex flex-col gap-2">
					{uploads.map((upload) => (
						<UploadRow key={upload.id} upload={upload} />
					))}
				</ul>
			)}
		</section>
	);
}

function UploadRow({ upload }: { upload: FileUpload }) {
	return (
		<li className="flex flex-col gap-0.5 border-fob-700 border-b pb-2 text-sm">
			<div className="flex items-baseline justify-between gap-4">
				<span className="min-w-0 truncate text-fob-text">
					{upload.file.name}
				</span>
				<span className={cn("shrink-0", STATUS_CLASSES[upload.status])}>
					{STATUS_LABELS[upload.status]}
				</span>
			</div>
			{upload.error && <p className="text-destructive">{upload.error}</p>}
		</li>
	);
}
