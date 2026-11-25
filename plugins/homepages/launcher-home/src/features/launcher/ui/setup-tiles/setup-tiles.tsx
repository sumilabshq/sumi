import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { setups } from "@sumi/setups/contract";
import type { Row } from "@sumi/command-menu/contract";
import { SetupThumb } from "../setup-thumb/setup-thumb.js";

export interface SetupTilesProps {
	readonly appRows: readonly Row[];
	readonly homeTabId: string;
}

const LABEL = "Setups";
const CHAT_TITLE = "Chat";

export function SetupTiles({ appRows, homeTabId }: SetupTilesProps): ReactElement | null {
	const listed = useOptionalQuery(setups.setups.all).data?.setups ?? [];
	const open = useCommand(setups.setups.open);

	if (listed.length === 0) {
		return null;
	}

	return (
		<section className="sumi-launcher-section" aria-label={LABEL}>
			<div className="sumi-launcher-label">{LABEL}</div>
			<div className="sumi-launcher-setups">
				{listed.map((setup) => (
					<button
						key={setup.id}
						type="button"
						className="sumi-launcher-setup"
						title={[CHAT_TITLE, ...setup.panes.map(({ title }) => title)].join(", ")}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => void open.run({ id: setup.id, homeTabId })}
					>
						<SetupThumb setup={setup} appRows={appRows} />
						<span className="sumi-launcher-setup-name">{setup.title}</span>
					</button>
				))}
			</div>
		</section>
	);
}
