import { z } from "zod";
import { requiredName } from "#/shared/schemas";

export interface Section {
	id: string;
	name: string;
}

export const sectionInputSchema = z.object({ name: requiredName });
