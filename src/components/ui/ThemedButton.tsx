import type { AnchorHTMLAttributes } from "react";
import { cn } from "#/lib/utils";

const THEMED_BUTTON_CLASSES =
	"inline-flex items-center justify-center gap-2 rounded-sm border border-fob-amber/40 bg-transparent px-8 py-3 font-medium font-sans text-base text-fob-gold transition-colors hover:border-fob-amber hover:bg-fob-amber/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fob-amber/50";

/** The FOB signature call to action: amber hairline outline with a gold label. One per view. */
export function ThemedButton({
	className,
	...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
	return <a className={cn(THEMED_BUTTON_CLASSES, className)} {...props} />;
}
