import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DeleteCommand,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { EntityRepository } from "./entity-repository";

/**
 * Single-table layout:
 *   pk = <ENTITY>#<id>, sk = <ENTITY>       → one item per entity
 *   gsi1pk = <ENTITY>, gsi1sk = <sort key>  → list every entity of a kind
 */
interface Options<T> {
	tableName: () => string;
	entity: string;
	idOf: (entity: T) => string;
	sortKeyOf: (entity: T) => string;
	client?: DynamoDBDocumentClient;
}

let sharedClient: DynamoDBDocumentClient | undefined;

function defaultClient(): DynamoDBDocumentClient {
	sharedClient ??= DynamoDBDocumentClient.from(new DynamoDBClient({}), {
		marshallOptions: { removeUndefinedValues: true },
	});
	return sharedClient;
}

export function createDynamoRepository<T>({
	tableName,
	entity,
	idOf,
	sortKeyOf,
	client,
}: Options<T>): EntityRepository<T> {
	const db = () => client ?? defaultClient();
	const key = (id: string) => ({ pk: `${entity}#${id}`, sk: entity });

	return {
		async get(id) {
			const result = await db().send(
				new GetCommand({ TableName: tableName(), Key: key(id) }),
			);
			return (result.Item?.data as T | undefined) ?? null;
		},

		async list() {
			const items: T[] = [];
			let cursor: Record<string, unknown> | undefined;
			do {
				const page = await db().send(
					new QueryCommand({
						TableName: tableName(),
						IndexName: "gsi1",
						KeyConditionExpression: "gsi1pk = :entity",
						ExpressionAttributeValues: { ":entity": entity },
						ExclusiveStartKey: cursor,
					}),
				);
				for (const item of page.Items ?? []) items.push(item.data as T);
				cursor = page.LastEvaluatedKey;
			} while (cursor);
			return items;
		},

		async put(value) {
			await db().send(
				new PutCommand({
					TableName: tableName(),
					Item: {
						...key(idOf(value)),
						gsi1pk: entity,
						gsi1sk: sortKeyOf(value),
						data: value,
					},
				}),
			);
		},

		async delete(id) {
			await db().send(
				new DeleteCommand({ TableName: tableName(), Key: key(id) }),
			);
		},
	};
}
