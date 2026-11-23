import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({ component: Home });

function Home() {
	const { member } = Route.useRouteContext();

	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
			<img
				src="/logo_simple.webp"
				alt="Florencia Orquesta Band"
				className="w-[min(240px,60vw)]"
			/>
			<h1 className="page-title">Hola, {member.name}</h1>
			<a
				href="/auth/logout"
				className="text-fob-subtle text-sm underline-offset-4 hover:text-fob-gold hover:underline"
			>
				Salir
			</a>
		</main>
	);
}
