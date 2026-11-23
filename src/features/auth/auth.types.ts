export interface SessionPayload {
	/** Member email, lowercase. */
	email: string;
	/** Expiry as epoch milliseconds. */
	exp: number;
}
