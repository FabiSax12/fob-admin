import { useState } from "react";
import { Button } from "#/components/ui/button";

interface ConfirmButtonProps {
	label: string;
	question: string;
	onConfirm: () => Promise<void>;
}

/** A destructive action that asks once inline before running, instead of a browser dialog. */
export function ConfirmButton({
	label,
	question,
	onConfirm,
}: ConfirmButtonProps) {
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
				variant="ghost"
				className="h-11 self-start text-destructive hover:text-destructive"
				onClick={() => setIsAsking(true)}
			>
				{label}
			</Button>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<p className="text-fob-subtle text-sm">{question}</p>
			<Button
				type="button"
				variant="destructive"
				className="h-11"
				disabled={isRunning}
				onClick={confirm}
			>
				{label}
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
	);
}
