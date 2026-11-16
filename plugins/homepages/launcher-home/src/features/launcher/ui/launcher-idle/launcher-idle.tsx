import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { HomeIdleView } from "@sumi/command-menu-plugin";
import type { Row } from "@sumi/command-menu/contract";
import { AppTiles } from "../app-tiles/app-tiles.js";
import { ContinueRows } from "../continue-rows/continue-rows.js";
import { SetupTiles } from "../setup-tiles/setup-tiles.js";

export interface LauncherIdleProps {
	readonly view: HomeIdleView;
	readonly homeTabId: string;
}

const CONTINUE_SHOWN = 4;

export function LauncherIdle({ view, homeTabId }: LauncherIdleProps): ReactElement {
	const rows = view.sections.flatMap((section) => section.rows);
	const appRows = rows.filter(isAppRow);
	return (
		<div className="sumi-launcher-idle">
			<SetupTiles appRows={appRows} homeTabId={homeTabId} />
			<AppTiles appRows={appRows} run={view.run} />
			<ContinueRows rows={rows.filter((row) => !isAppRow(row)).slice(0, CONTINUE_SHOWN)} run={view.run} />
		</div>
	);
}

function isAppRow(row: Row): boolean {
	return row.kind === "app";
}
