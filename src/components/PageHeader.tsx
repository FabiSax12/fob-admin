import type { ReactNode } from "react";

interface PageHeaderProps {
	title: string;
	eyebrow?: string;
	actions?: ReactNode;
}

/** Opens each app screen: optional eyebrow, the serif title with its amber rule, and the screen's actions. */
export function PageHeader({ title, eyebrow, actions }: PageHeaderProps) {
	return (
		<header className="mb-10 flex flex-wrap items-end justify-between gap-4">
			<div>
				{eyebrow && <p className="eyebrow">{eyebrow}</p>}
				<h1 className="section-title text-fob-text">{title}</h1>
				<span aria-hidden className="amber-rule" />
			</div>
			{actions}
		</header>
	);
}
