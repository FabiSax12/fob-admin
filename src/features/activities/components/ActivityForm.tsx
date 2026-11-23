import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { FormField, hintIdOf } from "#/components/FormField";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import type { Member } from "#/features/members/members.types";
import type { Section } from "#/features/sections/sections.types";
import type { Song } from "#/features/songs/songs.types";
import type { ActionResult } from "#/lib/action-result";
import { defaultAttendees } from "../activities.service";
import {
	ACTIVITY_TYPE_LABELS,
	ACTIVITY_TYPES,
	type Activity,
	type ActivityInput,
	type ActivityType,
} from "../activities.types";
import {
	type ScheduleFields,
	toSchedule,
	toScheduleFields,
} from "../activity-schedule";
import { AttendeeChecklist } from "./AttendeeChecklist";
import { SetlistEditor } from "./SetlistEditor";

const SAVE_FAILED_MESSAGE = "No pudimos guardar la actividad. Probá de nuevo.";
const MISSING_SCHEDULE_MESSAGE =
	"Completá la fecha y las horas de inicio y fin.";
const END_TIME_HINT =
	"Si termina después de medianoche, cuenta para el día siguiente.";
const FIELD_CLASSES = "h-11 bg-fob-900";

interface ActivityDraft {
	type: ActivityType;
	title: string;
	schedule: ScheduleFields;
	location: string;
	notes: string;
	sectionId: string | null;
	attendees: string[];
	setlist: string[];
}

interface ActivityFormProps {
	initialActivity?: Activity;
	members: Member[];
	sections: Section[];
	songs: Song[];
	submitLabel: string;
	save: (input: ActivityInput) => Promise<ActionResult<Activity>>;
}

function draftOf(activity: Activity): ActivityDraft {
	return {
		type: activity.type,
		title: activity.title,
		schedule: toScheduleFields(activity),
		location: activity.location,
		notes: activity.notes,
		sectionId: activity.sectionId,
		attendees: activity.attendees,
		setlist: activity.setlist,
	};
}

function emptyDraft(members: Member[]): ActivityDraft {
	const type: ActivityType = "ensayo";
	return {
		type,
		title: "",
		schedule: { date: "", startTime: "", endTime: "" },
		location: "",
		notes: "",
		sectionId: null,
		attendees: defaultAttendees(type, members, null),
		setlist: [],
	};
}

function hasCompleteSchedule({ date, startTime, endTime }: ScheduleFields) {
	return Boolean(date && startTime && endTime);
}

function toActivityInput(draft: ActivityDraft): ActivityInput {
	const isPresentation = draft.type === "presentacion";
	return {
		type: draft.type,
		title: draft.title,
		...toSchedule(draft.schedule),
		location: draft.location,
		notes: draft.notes,
		sectionId: draft.type === "seccional" ? draft.sectionId : null,
		attendees: draft.attendees,
		setlist: isPresentation ? draft.setlist : [],
	};
}

/** Create and edit form for an activity. Changing the type or section refills the attendees. */
export function ActivityForm({
	initialActivity,
	members,
	sections,
	songs,
	submitLabel,
	save,
}: ActivityFormProps) {
	const navigate = useNavigate();
	const [draft, setDraft] = useState<ActivityDraft>(() =>
		initialActivity ? draftOf(initialActivity) : emptyDraft(members),
	);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	function change(fields: Partial<ActivityDraft>) {
		setDraft((current) => ({ ...current, ...fields }));
	}

	function changeSchedule(fields: Partial<ScheduleFields>) {
		setDraft((current) => ({
			...current,
			schedule: { ...current.schedule, ...fields },
		}));
	}

	function changeCallGroup(type: ActivityType, sectionId: string | null) {
		change({
			type,
			sectionId,
			attendees: defaultAttendees(type, members, sectionId),
		});
	}

	function toggleAttendee(email: string, isChecked: boolean) {
		const others = draft.attendees.filter((attendee) => attendee !== email);
		change({ attendees: isChecked ? [...others, email] : others });
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		if (!hasCompleteSchedule(draft.schedule)) {
			setError(MISSING_SCHEDULE_MESSAGE);
			return;
		}
		setIsSaving(true);
		try {
			const result = await save(toActivityInput(draft));
			if (!result.ok) {
				setError(result.error);
				return;
			}
			await navigate({
				to: "/actividades/$activityId",
				params: { activityId: result.data.id },
			});
		} catch {
			setError(SAVE_FAILED_MESSAGE);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<form onSubmit={submit} className="flex flex-col gap-6" noValidate>
			<FormField id="activity-type" label="Tipo">
				<Select
					value={draft.type}
					onValueChange={(type) =>
						changeCallGroup(type as ActivityType, draft.sectionId)
					}
				>
					<SelectTrigger
						id="activity-type"
						className={`w-full ${FIELD_CLASSES}`}
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ACTIVITY_TYPES.map((type) => (
							<SelectItem key={type} value={type} className="min-h-11">
								{ACTIVITY_TYPE_LABELS[type]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormField>

			{draft.type === "seccional" && (
				<SectionSelect
					sections={sections}
					sectionId={draft.sectionId}
					onChange={(sectionId) => changeCallGroup(draft.type, sectionId)}
				/>
			)}

			<FormField id="activity-title" label="Título">
				<Input
					id="activity-title"
					required
					autoComplete="off"
					className={FIELD_CLASSES}
					value={draft.title}
					onChange={(event) => change({ title: event.target.value })}
				/>
			</FormField>

			<FormField id="activity-date" label="Fecha">
				<Input
					id="activity-date"
					type="date"
					required
					className={FIELD_CLASSES}
					value={draft.schedule.date}
					onChange={(event) => changeSchedule({ date: event.target.value })}
				/>
			</FormField>

			<div className="grid grid-cols-2 gap-4">
				<FormField id="activity-start" label="Inicio">
					<Input
						id="activity-start"
						type="time"
						required
						className={FIELD_CLASSES}
						value={draft.schedule.startTime}
						onChange={(event) =>
							changeSchedule({ startTime: event.target.value })
						}
					/>
				</FormField>
				<FormField id="activity-end" label="Fin">
					<Input
						id="activity-end"
						type="time"
						required
						aria-describedby={hintIdOf("activity-end")}
						className={FIELD_CLASSES}
						value={draft.schedule.endTime}
						onChange={(event) =>
							changeSchedule({ endTime: event.target.value })
						}
					/>
				</FormField>
			</div>
			<p
				id={hintIdOf("activity-end")}
				className="-mt-4 text-fob-subtle text-sm"
			>
				{END_TIME_HINT}
			</p>

			<FormField id="activity-location" label="Lugar">
				<Input
					id="activity-location"
					autoComplete="off"
					className={FIELD_CLASSES}
					value={draft.location}
					onChange={(event) => change({ location: event.target.value })}
				/>
			</FormField>

			<FormField id="activity-notes" label="Notas">
				<textarea
					id="activity-notes"
					rows={3}
					className="min-h-24 w-full rounded-md border border-input bg-fob-900 px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
					value={draft.notes}
					onChange={(event) => change({ notes: event.target.value })}
				/>
			</FormField>

			{draft.type === "presentacion" && (
				<SetlistEditor
					songs={songs}
					setlist={draft.setlist}
					onChange={(setlist) => change({ setlist })}
				/>
			)}

			<AttendeeChecklist
				members={members}
				selectedEmails={draft.attendees}
				onToggle={toggleAttendee}
			/>

			{error && (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}

			<Button
				type="submit"
				className="h-11 self-start px-8"
				disabled={isSaving}
			>
				{isSaving ? "Guardando…" : submitLabel}
			</Button>
		</form>
	);
}

interface SectionSelectProps {
	sections: Section[];
	sectionId: string | null;
	onChange: (sectionId: string) => void;
}

function SectionSelect({ sections, sectionId, onChange }: SectionSelectProps) {
	if (sections.length === 0) {
		return (
			<p className="text-fob-subtle text-sm">
				Todavía no hay secciones. Crealas desde Miembros, Administrar secciones.
			</p>
		);
	}

	return (
		<FormField id="activity-section" label="Sección">
			<Select value={sectionId ?? ""} onValueChange={onChange}>
				<SelectTrigger
					id="activity-section"
					className={`w-full ${FIELD_CLASSES}`}
				>
					<SelectValue placeholder="Elegí la sección" />
				</SelectTrigger>
				<SelectContent>
					{sections.map((section) => (
						<SelectItem
							key={section.id}
							value={section.id}
							className="min-h-11"
						>
							{section.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FormField>
	);
}
