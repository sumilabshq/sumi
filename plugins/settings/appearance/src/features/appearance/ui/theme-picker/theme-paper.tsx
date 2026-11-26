import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface ThemePaperProps {
	readonly paper: "light" | "dark";
	readonly isSplit?: boolean;
}

export function ThemePaper({ paper, isSplit = false }: ThemePaperProps): ReactElement {
	return (
		<span className={`sumi-paper is-${paper}${isSplit ? " is-split" : ""}`}>
			<span className="sumi-paper-side">
				<span className="sumi-paper-bar is-strong" style={{ width: "70%" }} />
				<span className="sumi-paper-bar" />
				<span className="sumi-paper-bar" style={{ width: "60%" }} />
			</span>
			<span className="sumi-paper-pane">
				<span className="sumi-paper-bar is-strong" style={{ width: "50%" }} />
				<span className="sumi-paper-bar" />
				<span className="sumi-paper-bar" style={{ width: "80%" }} />
				<span className="sumi-paper-foot">
					<span className="sumi-paper-caret" />
					<span className="sumi-paper-bar" style={{ flex: 1 }} />
				</span>
			</span>
		</span>
	);
}
