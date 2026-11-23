import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ThemedButton } from "#/components/ui/ThemedButton";
import { getCurrentMember } from "#/features/auth/auth.functions";
import { loginErrorMessage } from "#/features/auth/login-errors";

const loginSearchSchema = z.object({
	error: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	validateSearch: loginSearchSchema,
	beforeLoad: async () => {
		if (await getCurrentMember()) throw redirect({ to: "/" });
	},
	component: Login,
});

function Login() {
	const { error } = Route.useSearch();
	const errorMessage = loginErrorMessage(error);

	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 text-center">
			<img
				src="/logo_simple.webp"
				alt="Florencia Orquesta Band"
				className="w-[min(320px,80vw)]"
			/>
			<p className="font-serif text-xl italic text-fob-subtle">
				Creando momentos a través de la música
			</p>
			{errorMessage && (
				<p role="alert" className="text-destructive text-sm">
					{errorMessage}
				</p>
			)}
			<ThemedButton href="/auth/google">Entrar con Google</ThemedButton>
		</main>
	);
}
