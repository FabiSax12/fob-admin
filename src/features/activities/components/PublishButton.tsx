import { useState } from "react";
import { Button } from "#/components/ui/button";

const PUBLISH_CONSEQUENCE =
	"Al publicar, los convocados la ven en la app y reciben la invitación en su calendario.";

/** Publishing reaches every attendee, so it asks once inline before running. */
export function PublishButton({
	onConfirm,
}: {
	onConfirm: () => Promise<void>;
}) {
	const [isAsking, setIsAsking] = useState(false);
	const [isRunning, setIsRunning] = useState(false);

	async function confirm() {
		setIsRunning(true);
		try {
			await onConfirm();
		} finally {
			setIsRunning(false);
			setIsAsking(false);
		}
	}

	if (!isAsking) {
		return (
			<Button
				type="button"
				className="h-11 self-start px-8"
				onClick={() => setIsAsking(true)}
			>
				Publicar
			</Button>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<p className="max-w-[38ch] text-fob-subtle text-sm">
				{PUBLISH_CONSEQUENCE}
			</p>
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					className="h-11 px-8"
					disabled={isRunning}
					onClick={confirm}
				>
					{isRunning ? "Publicando…" : "Publicar"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					className="h-11"
					disabled={isRunning}
					onClick={() => setIsAsking(false)}
				>
					Cancelar
				</Button>
			</div>
		</div>
	);
}
