import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { workspaces } from "@widgetarium/workspaces/contract";
import { useWindowApp } from "@sumi/settings-ui-plugin";
import { RuntimeProvider } from "@widgetarium/data-framework";

const INKS = ["yellow", "ember", "moss", "tide", "iris", "rose"] as const;
const CLOVER = "M1 0h2v1H1zM4 0h2v1H4zM0 1h3v2H0zM4 1h3v2H4zM3 3h1v1H3zM0 4h3v2H0zM4 4h3v2H4zM1 6h2v1H1zM4 6h2v1H4z";

// TODO: custom ink
function Inks(): ReactElement {
	const current = useOptionalQuery(workspaces.workspaces.all).data?.current;
	const setInk = useCommand(workspaces.workspaces.setInk);
	return (
		<div className="sumi-appearance-inks">
			{INKS.map((ink) => (
				<button
					key={ink}
					type="button"
					className={`sumi-appearance-ink sumi-ink-${ink}`}
					aria-label={ink}
					aria-pressed={current?.ink === ink}
					disabled={current === undefined}
					onClick={() => current === undefined || void setInk.run({ id: current.id, ink })}
				>
					<svg viewBox="-.5 -.5 8 8" width="28" height="28" aria-hidden="true">
						<path d={CLOVER} fill="var(--accent-base)" />
					</svg>
				</button>
			))}
		</div>
	);
}

export function InkPicker(): ReactElement {
	const windowApp = useWindowApp();
	return (
		<section className="sumi-appearance-section">
			<h2 className="sumi-appearance-heading">Workspace ink</h2>
			<p className="sumi-appearance-hint">The colour of this workspace: its clover, the caret, links.</p>
			{windowApp === null ? null : (
				<RuntimeProvider runtime={windowApp}>
					<Inks />
				</RuntimeProvider>
			)}
		</section>
	);
}
