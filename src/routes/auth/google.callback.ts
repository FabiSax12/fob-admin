import { createFileRoute } from "@tanstack/react-router";
import { completeGoogleLogin } from "#/features/auth/auth.server";

export const Route = createFileRoute("/auth/google/callback")({
	server: {
		handlers: {
			GET: ({ request }) => completeGoogleLogin(request),
		},
	},
});
