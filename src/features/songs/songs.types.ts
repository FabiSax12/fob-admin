import { z } from "zod";
import { fileSafeName } from "#/shared/schemas";

export interface Song {
	id: string;
	/** Song name. It is also the S3 folder name and cannot change after creation. */
	name: string;
	/** S3 prefix that holds one PDF per part. */
	folder: string;
	createdAt: string;
}

export const songInputSchema = z.object({ name: fileSafeName });
