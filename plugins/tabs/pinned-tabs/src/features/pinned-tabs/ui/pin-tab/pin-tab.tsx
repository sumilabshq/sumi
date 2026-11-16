import { createElement as h } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement } from "react";
import { useTabFace } from "@sumi/sumi-host-plugin";
import type { PinView } from "../../lib/pin-views.js";
import type { PinActs } from "../../lib/use-pin-acts.js";
import { PinEnd } from "../pin-end/pin-end.js";

export interface PinTabProps {
	readonly view: PinView;
	readonly acts: PinActs;
	readonly onMenu: (view: PinView, event: MouseEvent<HTMLElement>) => void;
}

const ELSEWHERE = "{title}, open in another window";
const PRESS_KEYS: ReadonlySet<string> = new Set(["Enter", " "]);

export function PinTab({ view, acts, onMenu }: PinTabProps): ReactElement {
	const TabFace = useTabFace();
	const { pin, tab, place } = view;
	const title = tab?.title ?? pin.title;
	const isShown = tab?.isShown ?? false;
	return (
		<div
			role="tab"
			tabIndex={0}
			aria-selected={isShown}
			aria-label={title}
			title={place === "elsewhere" ? ELSEWHERE.replace("{title}", title) : title}
			className="sumi-strip-tab sumi-pin-tab"
			data-pin={pin.id}
			data-place={place}
			data-own-drag=""
			data-shown={isShown ? "" : undefined}
			onClick={() => acts.open(pin)}
			onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
				if (PRESS_KEYS.has(event.key)) {
					event.preventDefault();
					acts.open(pin);
				}
			}}
			onContextMenu={(event) => {
				event.preventDefault();
				onMenu(view, event);
			}}
		>
			<span className="sumi-strip-tab-icons">
				<span className="sumi-strip-tab-icon">
					<TabFace
						art={tab?.icon ?? pin.icon}
						favicon={tab?.favicon ?? pin.favicon}
						title={title}
						address={tab?.address ?? pin.address}
						mark={tab?.mark ?? "none"}
					/>
				</span>
			</span>
			<span className="sumi-strip-tab-title">{title}</span>
			<PinEnd onUnpin={() => acts.unpin(pin.id)} />
		</div>
	);
}
