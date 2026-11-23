import {
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Resource } from "sst";
import { partNameFromKey, type ScoreStorage, sortParts } from "./score-storage";
import { partKey, songFolder } from "./songs.service";

const PDF_CONTENT_TYPE = "application/pdf";
const UPLOAD_URL_EXPIRY_SECONDS = 10 * 60;
const DOWNLOAD_URL_EXPIRY_SECONDS = 15 * 60;

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
