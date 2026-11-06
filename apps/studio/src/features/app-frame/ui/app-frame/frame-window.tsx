import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { APP_FRAME_SANDBOX } from "../../lib/frame-sandbox.js";
import { useFramePort } from "../../lib/use-frame-port.js";
import { useReplaysFrameKeys } from "../../lib/use-replays-frame-keys.js";

export interface FrameWindowProps {
	readonly app: string;
	readonly url: string;
	readonly tabId: string;
}

const TAB_IN_URL = "#sumi-tab=";

export function FrameWindow({ app, url, tabId }: FrameWindowProps): ReactElement {
	const frame = useRef<HTMLIFrameElement | null>(null);
	const [isAnswered, setAnswered] = useState(false);
	useFramePort(frame, { app, tabId }, (answer) => {
		if (answer.ok) {
			setAnswered(true);
		}
	});
	useReplaysFrameKeys(frame, app);
	const src =`${url}${TAB_IN_URL}${encodeURIComponent(tabId)}`;

	return (
		<iframe
			ref={frame}
			className="wg-app-frame"
			title={app}
			src={src}
			sandbox={APP_FRAME_SANDBOX}
			data-app-frame={app}
			data-app-frame-tab={tabId}
			data-app-frame-src={url}
			data-app-frame-answered={isAnswered ? "" : undefined}
		/>
	);
}
