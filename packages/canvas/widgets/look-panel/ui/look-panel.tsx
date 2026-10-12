import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { LookRead } from "../../../schemas/look.schema.js";
import { LiveLookTokens } from "./live-look-tokens.js";
import { LookRow } from "./look-row.js";

export type LookPicked = (settingName: string, option: string) => void;

const TITLE = "Look";
const UNREADABLE = "The look cannot be read: {why}";
const PANEL =
	"cv:pointer-events-auto cv:absolute cv:inset-y-0 cv:right-0 cv:z-[1] cv:flex cv:w-[248px] cv:cursor-default cv:flex-col cv:gap-4 cv:pt-[84px] cv:pr-3 cv:pb-4 cv:pl-2 cv:before:absolute cv:before:inset-[0_0_0_-64px] cv:before:-z-[1] cv:before:backdrop-blur-[14px] cv:before:content-[''] cv:before:[mask-image:linear-gradient(to_left,black_calc(100%-64px),transparent)]";
const SAID = "cv:text-xs cv:text-muted-foreground";

export function LookPanel({ read, onPick }: { readonly read: LookRead; readonly onPick: LookPicked }): ReactElement {
	if ("refusal" in read)
		return (
			<aside className={PANEL} data-canvas-chrome="">
				<span className="cv:text-base cv:font-semibold">{TITLE}</span>
				<span className={SAID}>{UNREADABLE.replace("{why}", read.refusal)}</span>
			</aside>
		);
	const look = read.value;
	return (
		<aside className={PANEL} data-canvas-chrome="">
			<LiveLookTokens look={look} />
			<div className="cv:flex cv:items-baseline cv:justify-between cv:gap-2">
				<span className="cv:text-base cv:font-semibold">{TITLE}</span>
				<span className={SAID}>{look.system}</span>
			</div>
			{look.settings.map((setting) => (
				<LookRow key={setting.name} setting={setting} onPick={onPick} />
			))}
		</aside>
	);
}
