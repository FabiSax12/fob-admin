import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
			<img
				src="/logo_simple.webp"
				alt="Florencia Orquesta Band"
				className="w-[min(320px,80vw)]"
			/>
			<p className="font-serif text-xl italic text-fob-subtle">
				Creando momentos a través de la música
			</p>
		</main>
	);
}
