import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentMember } from "#/features/auth/auth.functions";

export const Route = createFileRoute("/_app")({
	beforeLoad: async () => {
		const member = await getCurrentMember();
		if (!member) throw redirect({ to: "/login" });
		return { member };
	},
	component: Outlet,
});
