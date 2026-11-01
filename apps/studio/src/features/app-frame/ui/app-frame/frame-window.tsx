import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { APP_FRAME_SANDBOX } from "../../lib/frame-sandbox.js";
import { useFramePort } from "../../lib/use-frame-port.js";

export interface FrameWindowProps {
	readonly app: string;
	readonly url: string;
	readonly tabId: string;
	readonly onReady: () => void;
}

const TAB_IN_URL = "#sumi-tab=";

export function FrameWindow({ app, url, tabId, onReady }: FrameWindowProps): ReactElement {
	const frame = useRef<HTMLIFrameElement | null>(null);
	useFramePort(frame, { app, tabId }, (answer) => {
		if (answer.ok) {
			onReady();
		}
	});
	const src = `${url}${TAB_IN_URL}${encodeURIComponent(tabId)}`;

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
		/>
	);
}
