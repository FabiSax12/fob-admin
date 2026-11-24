import { describe, expect, it, vi } from "vitest";
import { loadFirstPage, scoreUploadForm } from "#/features/songs/score-upload";

describe("scoreUploadForm", () => {
	it("puts every signed field first and the file last, as S3 POST requires", () => {
		const file = new File(["%PDF-1.7"], "El año viejo - TROMPETA.pdf", {
			type: "application/pdf",
		});

		const form = scoreUploadForm(file, {
			key: "staging/ana@gmail.com/song-1.pdf",
			"Content-Type": "application/pdf",
			Policy: "cG9saWN5",
		});

		const entries = [...form.entries()];
		expect(entries.map(([name]) => name)).toEqual([
			"key",
			"Content-Type",
			"Policy",
			"file",
		]);
		expect(entries[0][1]).toBe("staging/ana@gmail.com/song-1.pdf");
		expect(entries[3][1]).toBeInstanceOf(File);
	});
});

function fakeTask(isCancelledAfter: { document?: boolean } = {}) {
	const page = { pageNumber: 1 };
	const getPage = vi.fn(async () => page);
	const destroy = vi.fn(async () => {});
	const loaded = vi.fn();
	const task = {
		destroy,
		get promise() {
			loaded();
			return Promise.resolve({ getPage });
		},
	};
	return { task, page, getPage, destroy, loaded, isCancelledAfter };
}

describe("loadFirstPage", () => {
	it("returns page 1 and keeps the document when nobody cancelled", async () => {
		const { task, page, getPage, destroy } = fakeTask();

		await expect(loadFirstPage(task, () => false)).resolves.toBe(page);

		expect(getPage).toHaveBeenCalledWith(1);
		expect(destroy).not.toHaveBeenCalled();
	});

	it("destroys the task without loading the document when cancelled before it starts", async () => {
		const { task, loaded, getPage, destroy } = fakeTask();

		await expect(loadFirstPage(task, () => true)).resolves.toBeNull();

		expect(destroy).toHaveBeenCalledOnce();
		expect(loaded).not.toHaveBeenCalled();
		expect(getPage).not.toHaveBeenCalled();
	});

	it("destroys the document without reading page 1 when cancelled while it loaded", async () => {
		const { task, getPage, destroy } = fakeTask();
		let checks = 0;

		await expect(loadFirstPage(task, () => ++checks > 1)).resolves.toBeNull();

		expect(destroy).toHaveBeenCalledOnce();
		expect(getPage).not.toHaveBeenCalled();
	});

	it("destroys the document when cancelled while page 1 loaded", async () => {
		const { task, getPage, destroy } = fakeTask();
		let checks = 0;

		await expect(loadFirstPage(task, () => ++checks > 2)).resolves.toBeNull();

		expect(getPage).toHaveBeenCalledOnce();
		expect(destroy).toHaveBeenCalledOnce();
	});
});
