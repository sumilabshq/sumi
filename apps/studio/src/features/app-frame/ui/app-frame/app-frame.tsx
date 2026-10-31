import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useAppFrameFleet } from "../../lib/app-frames-context.js";
import { useAppFrameSeat } from "../../lib/use-app-frame-seat.js";
import { FrameNote } from "../frame-note/frame-note.js";
import { FrameWindow } from "./frame-window.js";

export interface AppFrameProps {
	readonly app: string;
	readonly tabId: string;
	readonly isShown: boolean;
}

const LOADING = "Opening {app}";

// TODO: busy and a failed start reach the fleet once an app reports them through a request
export function AppFrame({ app, tabId, isShown }: AppFrameProps): ReactElement {
	const fleet = useAppFrameFleet();
	const { frameId, running } = useAppFrameSeat(fleet, app, isShown);

	if (running === null) {
		return <FrameNote said={LOADING.replace("{app}", app)} />;
	}

	return (
		<FrameWindow
			key={`${running.version}:${running.loads}`}
			app={app}
			url={running.pageUrl}
			tabId={tabId}
			onReady={() => fleet.ready(frameId)}
		/>
	);
}
