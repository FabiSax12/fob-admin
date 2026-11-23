import { createFileRoute } from "@tanstack/react-router";
import { startGoogleLogin } from "#/features/auth/auth.server";

export const Route = createFileRoute("/auth/google")({
	server: {
		handlers: {
			GET: () => startGoogleLogin(),
		},
	},
});
