import { Link } from "@tanstack/react-router";
import {
	CalendarDays,
	FileMusic,
	ListMusic,
	LogOut,
	type LucideIcon,
	Users,
} from "lucide-react";
import type { Role } from "#/features/members/members.types";

interface Tab {
	to: "/actividades" | "/repertorio" | "/mis-partituras" | "/miembros";
	label: string;
	icon: LucideIcon;
	isVisibleTo: (role: Role) => boolean;
}

const everyone = () => true;

const TABS: Tab[] = [
	{
		to: "/actividades",
		label: "Actividades",
		icon: CalendarDays,
		isVisibleTo: everyone,
	},
	{
		to: "/repertorio",
		label: "Repertorio",
		icon: ListMusic,
		isVisibleTo: everyone,
	},
	{
		to: "/mis-partituras",
		label: "Mis partes",
		icon: FileMusic,
		// The sonidista has no part, so nothing to upload.
		isVisibleTo: (role) => role !== "sound",
	},
	{
		to: "/miembros",
		label: "Miembros",
		icon: Users,
		isVisibleTo: (role) => role === "director",
	},
];

const TAB_CLASSES =
	"flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-fob-subtle text-xs transition-colors hover:text-fob-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fob-amber/50";

export function AppTabBar({ role }: { role: Role }) {
	const visibleTabs = TABS.filter((tab) => tab.isVisibleTo(role));

	return (
		<nav
			aria-label="Navegación principal"
			className="fixed inset-x-0 bottom-0 z-40 border-fob-700 border-t bg-fob-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
		>
			<ul className="mx-auto flex max-w-2xl">
				{visibleTabs.map(({ to, label, icon: Icon }) => (
					<li key={to} className="flex flex-1">
						<Link
							to={to}
							className={TAB_CLASSES}
							activeProps={{ className: "text-fob-gold" }}
						>
							<Icon aria-hidden className="size-5" />
							{label}
						</Link>
					</li>
				))}
				<li className="flex flex-1">
					<a href="/auth/logout" className={TAB_CLASSES}>
						<LogOut aria-hidden className="size-5" />
						Salir
					</a>
				</li>
			</ul>
		</nav>
	);
}
