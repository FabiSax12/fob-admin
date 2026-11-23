import type { PublishEffectsEvent } from "#/features/publishing/personal-pdf.types";
import { container } from "#/server/container";

/** Invoked asynchronously on publish: Lambda retries it when it throws (calendar failures). */
export async function handler(event: PublishEffectsEvent): Promise<void> {
	await container.publishEffects.run(event.activityId);
}
