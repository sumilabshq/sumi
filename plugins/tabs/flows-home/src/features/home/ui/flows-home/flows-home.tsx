import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { SumiFigure } from "@sumi/sumi-host-plugin";
import { HomeEditingContext } from "../../../../shared/lib/home-editing-context.js";
import { AppTiles } from "../../../apps/ui/app-tiles/app-tiles.js";
import { ContinueRows } from "../../../continue/ui/continue-rows/continue-rows.js";
import { LauncherField } from "../../../launcher/ui/launcher-field/launcher-field.js";
import { SetupTiles } from "../../../setups/ui/setup-tiles/setup-tiles.js";
import { EditToggle } from "../edit-toggle/edit-toggle.js";

export interface FlowsHomeProps {
	readonly flowId: string;
	readonly paneId: string;
}

const QUESTION = "Where to?";
const MASCOT_PX = 96;

export function FlowsHome({ flowId, paneId }: FlowsHomeProps): ReactElement {
	const [isEditing, setEditing] = useState(false);
	return (
		<HomeEditingContext.Provider value={isEditing}>
			<div className="wg-shell-plate sumi-home" data-editing={isEditing ? "" : undefined}>
				<EditToggle isEditing={isEditing} onToggle={() => setEditing(!isEditing)} />
				<div className="sumi-home-scroll">
					<div className="sumi-home-column">
						<div className="sumi-home-head">
							<SumiFigure state="rest" size={MASCOT_PX} />
							<h1 className="sumi-home-question">{QUESTION}</h1>
						</div>
						<LauncherField flowId={flowId} paneId={paneId} />
						<SetupTiles />
						<AppTiles flowId={flowId} paneId={paneId} />
						<ContinueRows />
					</div>
				</div>
			</div>
		</HomeEditingContext.Provider>
	);
}
