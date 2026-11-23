import { createFileRoute } from "@tanstack/react-router";
import { logout } from "#/features/auth/auth.server";

export const Route = createFileRoute("/auth/logout")({
	server: {
		handlers: {
			GET: () => logout(),
		},
	},
});
