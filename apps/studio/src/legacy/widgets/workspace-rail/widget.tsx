import { createElement as h } from "react";
import { Icon } from "@widgetarium/kit";
import { defineLayout, defineMetadata } from "@widgetarium/core/gateway/declared.js";
import { PageInputSchema, PageOf } from "@widgetarium/core/gateway/page.js";
import { ICommand, IQuery } from "@widgetarium/core/gateway/queries.js";
import { useData } from "@widgetarium/core/gateway/use-data.js";
import { createWidget } from "@widgetarium/core/widget-api.js";
import {
	AppAskedSchema,
	AppRenamedSchema,
	NOTHING_ASKED,
	NothingAskedSchema,
	StudioAppSchema,
} from "../../shared/studio-app.js";
import { STUDIO_RAIL_PX } from "../../shared/studio-rail-size.js";
import { useRefusal } from "../use-refusal.js";
import { NewWorkspaceTile } from "./new-workspace-tile.js";
import { RailFailure } from "./rail-failure.js";
import { RailTile } from "./rail-tile.js";
import { WorkspaceTile } from "./workspace-tile.js";

const WORKSPACES_AT_ONCE = 50;

const MORE_WORKSPACES = "More workspaces";

const WorkspaceRail = createWidget({
	inject: {
		getCurrentApp: IQuery.input(NothingAskedSchema).output(StudioAppSchema),
		getApps: IQuery.input(PageInputSchema).output(PageOf(StudioAppSchema)),
		openApp: ICommand.input(AppAskedSchema),
		createApp: ICommand,
		renameApp: ICommand.input(AppRenamedSchema),
	},
	draw: ({ getCurrentApp, getApps, openApp, createApp, renameApp }) => {
		const { data: current } = useData(getCurrentApp, NOTHING_ASKED);
		const { data: apps, failure, hasMore, more } = useData(getApps, { limit: WORKSPACES_AT_ONCE });
		const { refusal, isAnsweredOk, dismiss } = useRefusal();
		return (
			<div className="wg-studio-rail-list" data-name="Workspaces">
				{failure === null ? null : <RailFailure said={failure} />}
				{apps.map((app) => (
					<WorkspaceTile
						key={app.id}
						app={app}
						isCurrent={app.id === current?.id}
						onOpen={() => openApp({ id: app.id })}
						onRename={(name) => renameApp({ id: app.id, name })}
					/>
				))}
				{hasMore ? (
					<RailTile label={MORE_WORKSPACES} onPress={more}>
						<Icon name="ellipsis" />
					</RailTile>
				) : null}
				<NewWorkspaceTile refusal={refusal} onCreate={() => void isAnsweredOk(createApp())} onDismiss={dismiss} />
			</div>
		);
	},
});

export const metadata = defineMetadata(WorkspaceRail, {
	title: "Workspace rail",
	description: "The studio's left rail: a tile per workspace, the open one marked, and a tile that starts a new one.",
	keywords: ["workspace", "switcher", "rail", "ribbon", "studio", "apps"],
	props: {
		getCurrentApp: { label: "This workspace", hint: "The workspace the studio shows: its tile is marked." },
		getApps: { label: "Workspaces", hint: "Every workspace the person can switch to." },
		openApp: { label: "Open a workspace", hint: "Switches to the workspace pressed in the rail." },
		createApp: { label: "New workspace", hint: "Starts an untitled workspace and opens it." },
		renameApp: { label: "Rename a workspace", hint: "A right press on a tile names it anew." },
	},
});

export const layout = defineLayout({
	role: "control",
	size: { preferredWidth: STUDIO_RAIL_PX, preferredHeight: "auto" },
});

export default WorkspaceRail;
