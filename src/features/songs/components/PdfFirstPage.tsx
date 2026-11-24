import { useEffect, useRef, useState } from "react";
import { loadFirstPage } from "../score-upload";

const PREVIEW_FAILED_MESSAGE = "No pudimos mostrar la vista previa.";

type PreviewState = "loading" | "ready" | "failed";

/** A picked file or the signed URL of a stored PDF. */
export type PdfSource = { file: File } | { url: string };

async function loadPdfjs() {
	const [pdfjs, worker] = await Promise.all([
		import("pdfjs-dist"),
		import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
	]);
	pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
	return pdfjs;
}

async function documentParams(source: PdfSource) {
	if ("url" in source) return { url: source.url };
	return { data: new Uint8Array(await source.file.arrayBuffer()) };
}

/**
 * Draws page 1 of a PDF. pdfjs loads on demand in the browser only, so the rest of the app
 * never ships it.
 */
export function PdfFirstPage({
	source,
	label,
}: {
	source: PdfSource;
	label: string;
}) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [state, setState] = useState<PreviewState>("loading");

	useEffect(() => {
		let isCancelled = false;
		let destroy: (() => Promise<void>) | undefined;
		setState("loading");

		async function render() {
			const pdfjs = await loadPdfjs();
			if (isCancelled) return;
			const params = await documentParams(source);
			if (isCancelled) return;
			const task = pdfjs.getDocument(params);
			destroy = () => task.destroy();
			const page = await loadFirstPage(task, () => isCancelled);
			const target = canvas.current;
			if (!page) return;
			if (!target) {
				await task.destroy();
				return;
			}

			const width = target.parentElement?.clientWidth ?? 360;
			const scale = width / page.getViewport({ scale: 1 }).width;
			const viewport = page.getViewport({
				scale: scale * window.devicePixelRatio,
			});
			target.width = viewport.width;
			target.height = viewport.height;
			await page.render({ canvas: target, viewport }).promise;
			if (!isCancelled) setState("ready");
		}

		render().catch(() => {
			if (!isCancelled) setState("failed");
		});
		return () => {
			isCancelled = true;
			void destroy?.();
		};
	}, [source]);

	return (
		<figure className="flex flex-col gap-2">
			<div className="relative min-h-48 overflow-hidden rounded-md border border-fob-700 bg-white">
				<canvas
					ref={canvas}
					role="img"
					aria-label={label}
					className={state === "ready" ? "block h-auto w-full" : "hidden"}
				/>
				{state !== "ready" && (
					<p className="absolute inset-0 flex items-center justify-center p-4 text-center text-fob-700 text-sm">
						{state === "loading"
							? "Cargando vista previa…"
							: PREVIEW_FAILED_MESSAGE}
					</p>
				)}
			</div>
			<figcaption className="text-fob-subtle text-xs">
				Primera página
			</figcaption>
		</figure>
	);
}
