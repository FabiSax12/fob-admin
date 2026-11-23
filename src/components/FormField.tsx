import type { ReactNode } from "react";
import { Label } from "#/components/ui/label";

interface FormFieldProps {
	id: string;
	label: string;
	hint?: string;
	children: ReactNode;
}

/** A form control with its label above and an optional hint below, as in the FOB TextField. */
export function FormField({ id, label, hint, children }: FormFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={id} className="instrument-label font-normal">
				{label}
			</Label>
			{children}
			{hint && (
				<p id={hintIdOf(id)} className="text-fob-subtle text-sm">
					{hint}
				</p>
			)}
		</div>
	);
}

export function hintIdOf(id: string): string {
	return `${id}-hint`;
}
