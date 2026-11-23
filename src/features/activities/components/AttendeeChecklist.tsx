import { Checkbox } from "#/components/ui/checkbox";
import { Label } from "#/components/ui/label";
import { type Member, ROLE_LABELS } from "#/features/members/members.types";

interface AttendeeChecklistProps {
	members: Member[];
	selectedEmails: string[];
	onToggle: (email: string, isChecked: boolean) => void;
}

/** Every member with a checkbox. The sonidista shows here too, unchecked unless the director marks him. */
export function AttendeeChecklist({
	members,
	selectedEmails,
	onToggle,
}: AttendeeChecklistProps) {
	return (
		<fieldset className="flex flex-col gap-1">
			<legend className="instrument-label mb-2">
				Convocados · {selectedEmails.length} de {members.length}
			</legend>
			{members.length === 0 && (
				<p className="text-fob-subtle text-sm">Todavía no hay miembros.</p>
			)}
			{members.map((member) => {
				const checkboxId = `attendee-${member.email}`;
				return (
					<div key={member.email} className="flex min-h-11 items-center gap-3">
						<Checkbox
							id={checkboxId}
							checked={selectedEmails.includes(member.email)}
							onCheckedChange={(checked) =>
								onToggle(member.email, checked === true)
							}
						/>
						<Label
							htmlFor={checkboxId}
							className="flex flex-1 flex-wrap items-baseline gap-x-2 font-normal text-base"
						>
							{member.name}
							<span className="text-fob-subtle text-sm">
								{member.part ?? ROLE_LABELS[member.role]}
							</span>
						</Label>
					</div>
				);
			})}
		</fieldset>
	);
}
