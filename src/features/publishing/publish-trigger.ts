import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { Resource } from "sst";
import type { PublishEffectsEvent } from "./personal-pdf.types";

/** Fire-and-forget: Lambda queues the event, so publishing never waits for the PDFs or the calendar. */
const ASYNC_INVOCATION = "Event";

let client: LambdaClient | undefined;

/** Server-only: starts the PublishEffects Lambda for one activity. */
export async function triggerPublishEffects(activityId: string): Promise<void> {
	client ??= new LambdaClient({});
	const event: PublishEffectsEvent = { activityId };
	await client.send(
		new InvokeCommand({
			FunctionName: Resource.PublishEffects.name,
			InvocationType: ASYNC_INVOCATION,
			Payload: new TextEncoder().encode(JSON.stringify(event)),
		}),
	);
}
