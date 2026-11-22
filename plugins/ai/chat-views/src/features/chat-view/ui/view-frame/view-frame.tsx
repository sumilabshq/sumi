import { createElement as h, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { ViewPart } from "@sumi/view-work/implementation";
import { frameOf } from "../../lib/frame-document.js";
import type { BuiltFrame } from "../../lib/frame-document.js";
import { FrameMessageSchema } from "../../lib/frame-messages.js";
import { VIEW_MESSAGE_KEY } from "../../lib/frame-runtime.js";
import { schemeOf, tokenSheetOf, watchesTheme } from "../../lib/live-tokens.js";

export interface ViewFrameProps {
	readonly id: string;
	readonly title: string;
	readonly html: string;
	readonly parts: readonly ViewPart[];
}

export const VIEW_FRAME_HEIGHT = 120;

const NOT_BUILT = "This view could not be drawn.";
const FRAME_FAILED = "[chat-views] {id}: the view frame was not built: {reason}";
const SANDBOX = "allow-scripts";
const FRAME_ALLOWS = "clipboard-write";

export function ViewFrame({ id, title, html, parts }: ViewFrameProps): ReactElement {
	const holder = useRef<HTMLDivElement | null>(null);
	const frame = useRef<HTMLIFrameElement | null>(null);
	const [built, setBuilt] = useState<BuiltFrame | null>(null);
	const [height, setHeight] = useState(VIEW_FRAME_HEIGHT);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		const host = holder.current;

		if (host === null) {
			return undefined;
		}

		let current = true;
		frameOf({
			html,
			parts,
			host,
		}).then(
			(made) => {
				if (current) {
					setBuilt(made);
				}
			},
			(error: unknown) => {
				console.error(FRAME_FAILED.replace("{id}", id).replace("{reason}", String(error)));
				setFailed(true);
			},
		);
		return () => {
			current = false;
		};
	}, [html, id, parts]);

	useEffect(() => {
		const heard = (event: MessageEvent): void => {
			const own = frame.current;

			if (own === null || event.source !== own.contentWindow) {
				return;
			}

			const message = FrameMessageSchema.safeParse(event.data);

			if (!message.success) {
				return;
			}

			if (message.data.sumiView === "height") {
				setHeight(message.data.height);
				return;
			}

			followLink(holder.current, message.data.href, message.data.inNewTab);
		};
		window.addEventListener("message", heard);
		return () => window.removeEventListener("message", heard);
	}, []);

	useEffect(() => {
		const host = holder.current;

		if (host === null || built === null) {
			return undefined;
		}

		return watchesTheme(host.ownerDocument, () => {
			frame.current?.style.setProperty("color-scheme", schemeOf(host.ownerDocument));
			frame.current?.contentWindow?.postMessage(
				{
					[VIEW_MESSAGE_KEY]: "tokens",
					css: tokenSheetOf(host, built.tokenNames),
				},
				"*",
			);
		});
	}, [built]);

	if (failed) {
		return <p style={{ margin: 0, color: "var(--text-3)" }}>{NOT_BUILT}</p>;
	}

	return (
		<div ref={holder} data-chat-view={id} style={{ display: "block", width: "100%" }}>
			{built === null ? null : (
				<iframe
					ref={frame}
					title={title}
					sandbox={SANDBOX}
					allow={FRAME_ALLOWS}
					srcDoc={built.source}
					style={{
						display: "block",
						width: "100%",
						height,
						border: 0,
						background: "transparent",
						colorScheme: holder.current === null ? "normal" : schemeOf(holder.current.ownerDocument),
					}}
				/>
			)}
		</div>
	);
}

function followLink(holder: HTMLElement | null, href: string, inNewTab: boolean): void {
	if (holder === null) {
		return;
	}

	const anchor = holder.ownerDocument.createElement("a");
	anchor.href = href;

	if (inNewTab) {
		anchor.target = "_blank";
	}

	anchor.hidden = true;
	holder.append(anchor);
	anchor.click();
	anchor.remove();
}
