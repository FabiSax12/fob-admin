import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Resource } from "sst";
import { DomainError } from "#/shared/errors";
import { STAGED_CHANGED_MESSAGE } from "./score-collection.service";
import { partNameFromKey, type ScoreStorage, sortParts } from "./score-storage";
import { partKey, REPERTOIRE_PREFIX, songFolder } from "./songs.service";

const PDF_CONTENT_TYPE = "application/pdf";
const UPLOAD_URL_EXPIRY_SECONDS = 10 * 60;
const DOWNLOAD_URL_EXPIRY_SECONDS = 15 * 60;
const HEADER_BYTES = 5;
const MISSING_OBJECT_ERRORS = new Set(["NoSuchKey", "NotFound"]);

function errorName(error: unknown): string {
	return error instanceof Error ? error.name : "";
}

/** Total size from a `Content-Range` such as `bytes 0-4/123456`. */
function totalSize(contentRange: string | undefined): number {
	return Number(contentRange?.split("/")[1] ?? Number.NaN);
}

/** CopySource wants each key segment URL-encoded, keeping the slashes. */
function copySource(bucket: string, key: string): string {
	return `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Server-only: keeps the part PDFs in the Scores bucket, under repertorio/<song>/<part>.pdf. */
export function createS3ScoreStorage(): ScoreStorage {
	const s3 = new S3Client({});
	const bucketName = () => Resource.Scores.name;

	async function listKeys(prefix: string): Promise<string[]> {
		const keys: string[] = [];
		let continuationToken: string | undefined;
		do {
			const page = await s3.send(
				new ListObjectsV2Command({
					Bucket: bucketName(),
					Prefix: prefix,
					ContinuationToken: continuationToken,
				}),
			);
			for (const object of page.Contents ?? []) {
				if (object.Key) keys.push(object.Key);
			}
			continuationToken = page.NextContinuationToken;
		} while (continuationToken);
		return keys;
	}

	return {
		async listParts(songName) {
			const keys = await listKeys(songFolder(songName));
			return sortParts(
				keys.flatMap((key) => partNameFromKey(songName, key) ?? []),
			);
		},

		listScoreKeys() {
			return listKeys(REPERTOIRE_PREFIX);
		},

		createStagedUploadUrl(stagingKey) {
			const upload = new PutObjectCommand({
				Bucket: bucketName(),
				Key: stagingKey,
				ContentType: PDF_CONTENT_TYPE,
			});
			return getSignedUrl(s3, upload, {
				expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
			});
		},

		async inspectStaged(stagingKey) {
			try {
				const object = await s3.send(
					new GetObjectCommand({
						Bucket: bucketName(),
						Key: stagingKey,
						Range: `bytes=0-${HEADER_BYTES - 1}`,
					}),
				);
				const bytes =
					(await object.Body?.transformToByteArray()) ?? new Uint8Array();
				return {
					size: totalSize(object.ContentRange),
					header: Buffer.from(bytes).toString("latin1"),
					etag: object.ETag ?? "",
				};
			} catch (error) {
				if (MISSING_OBJECT_ERRORS.has(errorName(error))) return null;
				// An empty object has no byte range to read: it is not a PDF.
				if (errorName(error) === "InvalidRange")
					return { size: 0, header: "", etag: "" };
				throw error;
			}
		},

		async promoteStaged(stagingKey, etag, songName, part) {
			try {
				await s3.send(
					new CopyObjectCommand({
						Bucket: bucketName(),
						CopySource: copySource(bucketName(), stagingKey),
						// Fails if the member re-uploaded after the check.
						CopySourceIfMatch: etag,
						Key: partKey(songName, part),
						ContentType: PDF_CONTENT_TYPE,
						MetadataDirective: "REPLACE",
					}),
				);
			} catch (error) {
				if (errorName(error) === "PreconditionFailed")
					throw new DomainError("conflict", STAGED_CHANGED_MESSAGE);
				throw error;
			}
		},

		async discardStaged(stagingKey) {
			await s3.send(
				new DeleteObjectCommand({ Bucket: bucketName(), Key: stagingKey }),
			);
		},

		createUploadUrl(songName, part) {
			const upload = new PutObjectCommand({
				Bucket: bucketName(),
				Key: partKey(songName, part),
				ContentType: PDF_CONTENT_TYPE,
			});
			return getSignedUrl(s3, upload, {
				expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
			});
		},

		createDownloadUrl(songName, part) {
			const download = new GetObjectCommand({
				Bucket: bucketName(),
				Key: partKey(songName, part),
				ResponseContentType: PDF_CONTENT_TYPE,
				ResponseContentDisposition: inlineDisposition(`${part}.pdf`),
			});
			return getSignedUrl(s3, download, {
				expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS,
			});
		},

		async deletePart(songName, part) {
			await s3.send(
				new DeleteObjectCommand({
					Bucket: bucketName(),
					Key: partKey(songName, part),
				}),
			);
		},
	};
}

/** Part names may carry accents, so the header uses the RFC 5987 form next to an ASCII fallback. */
function inlineDisposition(fileName: string): string {
	const asciiFallback = fileName.replace(/[^\x20-\x7e]|"/g, "_");
	return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export const s3ScoreStorage = createS3ScoreStorage();
