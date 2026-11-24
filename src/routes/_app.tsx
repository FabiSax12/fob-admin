import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppTabBar } from "#/components/AppTabBar";
import { ProfileBar } from "#/components/ProfileBar";
import { getCurrentMember } from "#/features/auth/auth.functions";

export const Route = createFileRoute("/_app")({
	beforeLoad: async () => {
		const member = await getCurrentMember();
		if (!member) throw redirect({ to: "/login" });
		return { member };
	},
	component: AppShell,
});

function AppShell() {
	const { member } = Route.useRouteContext();

	return (
		<>
			<main className="mx-auto min-h-dvh max-w-2xl px-[clamp(1.25rem,5vw,3rem)] pt-[max(2rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
				<ProfileBar member={member} />
				<Outlet />
			</main>
			<AppTabBar role={member.role} />
		</>
	);
}
