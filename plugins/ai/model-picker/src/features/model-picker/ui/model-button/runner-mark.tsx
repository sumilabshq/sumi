import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface RunnerMarkProps {
	readonly runner: string;
}

const CLAUDE_RUNNER = "claude-code";
const MARK_PX = 13;
const CLAUDE_RAYS = [
	"M12 2.5V8", "M16.75 3.77L14.5 8.4", "M20.23 7.25L15.6 9.5", "M21.5 12H16", "M20.23 16.75L15.6 14.5",
	"M16.75 20.23L14.5 15.6", "M12 21.5V16", "M7.25 20.23L9.5 15.6", "M3.77 16.75L8.4 14.5", "M2.5 12H8",
	"M3.77 7.25L8.4 9.5", "M7.25 3.77L9.5 8.4",
];

export function RunnerMark({ runner }: RunnerMarkProps): ReactElement {
	if (runner !== CLAUDE_RUNNER) return <Icon name="terminal" size={MARK_PX} />;
	return (
		<svg
			className="sumi-runner-mark"
			viewBox="0 0 24 24"
			width={MARK_PX}
			height={MARK_PX}
			fill="none"
			stroke="currentColor"
			strokeWidth="2.4"
			strokeLinecap="round"
			aria-hidden="true"
			style={{ color: "var(--brand-claude)" }}
		>
			{CLAUDE_RAYS.map((ray) => (
				<path key={ray} d={ray} />
			))}
		</svg>
	);
}
