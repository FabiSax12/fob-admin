import { PageHeader } from "./PageHeader";

/** Placeholder for app screens that are not built yet, so navigation always resolves. */
export function ComingSoon({ title }: { title: string }) {
	return (
		<>
			<PageHeader title={title} />
			<p className="text-fob-subtle">Próximamente.</p>
		</>
	);
}
