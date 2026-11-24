import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	S3Client,
} from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import { createS3ScoreStorage } from "#/features/songs/s3-score-storage";

const BUCKET = "bkt";

type Command = { constructor: { name: string }; input: object };
type Reply = (input: Record<string, unknown>) => unknown;

function s3Error(name: string): Error {
	const error = new Error(name);
	error.name = name;
	return error;
}

/** A stand-in S3Client: records every command and answers per command type. */
function stubClient(replies: Partial<Record<string, Reply>>) {
	const sent: Array<{ command: string; input: Record<string, unknown> }> = [];
	const client = {
		async send(command: Command) {
			const name = command.constructor.name;
			const input = command.input as Record<string, unknown>;
			sent.push({ command: name, input });
			const reply = replies[name];
			if (!reply) throw new Error(`unexpected ${name}`);
			return reply(input);
		},
	};
	return {
		sent,
		storage: createS3ScoreStorage({
			client: client as unknown as S3Client,
			bucketName: BUCKET,
		}),
	};
}

function bodyOf(text: string) {
	return { transformToByteArray: async () => Buffer.from(text, "latin1") };
}

describe("S3 score storage", () => {
	describe("inspectStaged", () => {
		it("reads the total size, the first bytes and the ETag with a range GET", async () => {
			const { sent, storage } = stubClient({
				[GetObjectCommand.name]: () => ({
					ContentRange: "bytes 0-4/1234",
					Body: bodyOf("%PDF-"),
					ETag: '"v1"',
				}),
			});

			await expect(
				storage.inspectStaged("staging/a@b.com/s.pdf"),
			).resolves.toEqual({
				size: 1234,
				header: "%PDF-",
				etag: '"v1"',
			});
			expect(sent).toEqual([
				{
					command: "GetObjectCommand",
					input: {
						Bucket: BUCKET,
						Key: "staging/a@b.com/s.pdf",
						Range: "bytes=0-4",
					},
				},
			]);
		});

		it("gives null when nothing was uploaded", async () => {
			const { storage } = stubClient({
				[GetObjectCommand.name]: () => {
					throw s3Error("NoSuchKey");
				},
			});

			await expect(storage.inspectStaged("staging/x.pdf")).resolves.toBeNull();
		});

		it("treats an empty upload as an empty, non-PDF file", async () => {
			const { storage } = stubClient({
				[GetObjectCommand.name]: () => {
					throw s3Error("InvalidRange");
				},
			});

			await expect(storage.inspectStaged("staging/x.pdf")).resolves.toEqual({
				size: 0,
				header: "",
				etag: "",
			});
		});

		it("gives an unknown size when S3 sends no Content-Range", async () => {
			const { storage } = stubClient({
				[GetObjectCommand.name]: () => ({
					Body: bodyOf("%PDF-"),
					ETag: '"v1"',
				}),
			});

			const staged = await storage.inspectStaged("staging/x.pdf");

			expect(staged?.size).toBeNaN();
		});

		it("rethrows any other S3 error", async () => {
			const { storage } = stubClient({
				[GetObjectCommand.name]: () => {
					throw s3Error("AccessDenied");
				},
			});

			await expect(storage.inspectStaged("staging/x.pdf")).rejects.toThrow(
				"AccessDenied",
			);
		});
	});

	describe("promoteStaged", () => {
		it("copies only the checked version to the part key and leaves the staged file", async () => {
			const { sent, storage } = stubClient({
				[CopyObjectCommand.name]: () => ({}),
			});

			await storage.promoteStaged(
				"staging/ñ a@b.com/id.pdf",
				'"v1"',
				"Rebelión",
				"Trompeta 1",
			);

			expect(sent).toEqual([
				{
					command: "CopyObjectCommand",
					input: expect.objectContaining({
						Bucket: BUCKET,
						CopySource: "bkt/staging/%C3%B1%20a%40b.com/id.pdf",
						CopySourceIfMatch: '"v1"',
						Key: "repertorio/Rebelión/Trompeta 1.pdf",
					}),
				},
			]);
			expect(
				sent.some(({ command }) => command === DeleteObjectCommand.name),
			).toBe(false);
		});

		it("reports a conflict when the staged file changed after the check", async () => {
			const { storage } = stubClient({
				[CopyObjectCommand.name]: () => {
					throw s3Error("PreconditionFailed");
				},
			});

			await expect(
				storage.promoteStaged("staging/x.pdf", '"v1"', "Rebelión", "Bajo"),
			).rejects.toMatchObject({
				code: "conflict",
				message: "El archivo cambió mientras lo revisábamos. Probá de nuevo.",
			});
		});
	});

	describe("createStagedUpload", () => {
		it("signs a POST policy capped at 20 MB, for the staging key and PDFs only", async () => {
			const client = new S3Client({
				region: "us-east-1",
				credentials: { accessKeyId: "AKIDTEST", secretAccessKey: "secret" },
			});
			const storage = createS3ScoreStorage({ client, bucketName: BUCKET });

			const upload = await storage.createStagedUpload("staging/a@b.com/s.pdf");

			expect(upload.fields).toMatchObject({
				key: "staging/a@b.com/s.pdf",
				"Content-Type": "application/pdf",
			});
			const policy = JSON.parse(
				Buffer.from(upload.fields.Policy, "base64").toString("utf8"),
			);
			expect(policy.conditions).toEqual(
				expect.arrayContaining([
					["content-length-range", 1, 20971520],
					{ key: "staging/a@b.com/s.pdf" },
					{ "Content-Type": "application/pdf" },
				]),
			);
		});
	});

	describe("listScoreKeys", () => {
		it("follows every page of the repertoire listing", async () => {
			const { sent, storage } = stubClient({
				[ListObjectsV2Command.name]: (input) =>
					input.ContinuationToken
						? { Contents: [{ Key: "repertorio/B/Bajo.pdf" }] }
						: {
								Contents: [{ Key: "repertorio/A/Bajo.pdf" }],
								NextContinuationToken: "page-2",
							},
			});

			await expect(storage.listScoreKeys()).resolves.toEqual([
				"repertorio/A/Bajo.pdf",
				"repertorio/B/Bajo.pdf",
			]);
			expect(sent.map(({ input }) => input.ContinuationToken)).toEqual([
				undefined,
				"page-2",
			]);
		});
	});
});
