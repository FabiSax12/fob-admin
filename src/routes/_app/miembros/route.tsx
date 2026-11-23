import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/miembros")({
	beforeLoad: ({ context }) => {
		if (context.member.role !== "director")
			throw redirect({ to: "/actividades" });
	},
	component: Outlet,
});
