/**
 * Builds the multipart body of a presigned S3 POST. S3 reads the signed fields first and
 * ignores anything after the file, so the file always goes last.
 */
export function scoreUploadForm(
	file: File,
	fields: Record<string, string>,
): FormData {
	const form = new FormData();
	for (const [name, value] of Object.entries(fields)) form.append(name, value);
	form.append("file", file);
	return form;
}

/** The slice of a pdfjs loading task that the first-page preview needs. */
export interface FirstPageTask<Page> {
	promise: Promise<{ getPage(pageNumber: number): Promise<Page> }>;
	destroy(): Promise<void>;
}

/**
 * Page 1 of a PDF, or null when the preview was cancelled meanwhile. A cancelled load is
 * destroyed at the next step, so fast song changes never leave documents in memory.
 */
export async function loadFirstPage<Page>(
	task: FirstPageTask<Page>,
	isCancelled: () => boolean,
): Promise<Page | null> {
	if (isCancelled()) {
		await task.destroy();
		return null;
	}
	const pdf = await task.promise;
	if (isCancelled()) {
		await task.destroy();
		return null;
	}
	const page = await pdf.getPage(1);
	if (isCancelled()) {
		await task.destroy();
		return null;
	}
	return page;
}
