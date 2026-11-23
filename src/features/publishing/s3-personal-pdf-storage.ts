import {
	GetObjectCommand,
	NoSuchKey,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Resource } from "sst";
import { partKey } from "#/features/songs/songs.service";
import { attachmentDisposition } from "./personal-pdf";
import type { GeneratedPdfWriter, ScoreReader } from "./publish-effects";

const PDF_CONTENT_TYPE = "application/pdf";
const DOWNLOAD_URL_EXPIRY_SECONDS = 15 * 60;

export interface PersonalPdfStorage extends ScoreReader, GeneratedPdfWriter {
	createDownloadUrl(key: string, fileName: string): Promise<string>;
}

/** Server-only: reads the part PDFs and keeps the generated setlist PDFs in the Scores bucket. */
export function createS3PersonalPdfStorage(): PersonalPdfStorage {
	let client: S3Client | undefined;
	const s3 = () => {
		client ??= new S3Client({});
		return client;
	};
	const bucketName = () => Resource.Scores.name;

	return {
		async readPart(songName, part) {
			try {
				const object = await s3().send(
					new GetObjectCommand({
						Bucket: bucketName(),
						Key: partKey(songName, part),
					}),
				);
				return object.Body ? await object.Body.transformToByteArray() : null;
			} catch (error) {
				if (error instanceof NoSuchKey) return null;
				throw error;
			}
		},

		async writePdf(key, bytes) {
			await s3().send(
				new PutObjectCommand({
					Bucket: bucketName(),
					Key: key,
					Body: bytes,
					ContentType: PDF_CONTENT_TYPE,
				}),
			);
		},

		createDownloadUrl(key, fileName) {
			const download = new GetObjectCommand({
				Bucket: bucketName(),
				Key: key,
				ResponseContentType: PDF_CONTENT_TYPE,
				ResponseContentDisposition: attachmentDisposition(fileName),
			});
			return getSignedUrl(s3(), download, {
				expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS,
			});
		},
	};
}
