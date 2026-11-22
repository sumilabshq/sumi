import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Pressable } from "@widgetarium/kit";
import { RowIcon } from "@sumi/command-menu-plugin";
import type { Intent, Row } from "@sumi/command-menu/contract";

export interface AppTilesProps {
	readonly appRows: readonly Row[];
	readonly run: (intent: Intent) => void;
}

const LABEL = "Apps";

export function AppTiles({ appRows, run }: AppTilesProps): ReactElement | null {
	if (appRows.length === 0) {
		return null;
	}

	return (
		<section className="sumi-launcher-section" aria-label={LABEL}>
			<div className="sumi-launcher-label">{LABEL}</div>
			<div className="sumi-launcher-apps">
				{appRows.map((row) => (
					<Pressable
						key={row.key}
						className="sumi-launcher-app"
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => run(row.intent)}
					>
						<RowIcon icon={row.icon} />
						<span className="sumi-launcher-app-name">{row.title}</span>
					</Pressable>
				))}
			</div>
		</section>
	);
}
