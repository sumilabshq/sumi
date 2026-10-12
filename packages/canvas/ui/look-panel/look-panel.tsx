import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { lookPanelInject } from "../../widgets/look-panel.widget.js";
import { SaidLine } from "../said-line/said-line.js";
import { useRefusal } from "../said-line/use-refusal.js";
import { LiveLookTokens } from "./live-look-tokens.js";
import { LOOK_PANEL, LOOK_SAID, LOOK_TITLE } from "./look-chrome.js";
import { LookRow } from "./look-row.js";
import { LookUnreadable } from "./look-unreadable.js";

export type LookPicked = (settingName: string, option: string) => void;

export function LookPanel({ getLook: read, pickLook }: InjectProps<typeof lookPanelInject>): ReactElement | null {
	const { refusal, heard } = useRefusal();
	const onPick: LookPicked = (settingName, option) => heard(pickLook({ settingName, option }));
	if (!read) return null;
	if ("refusal" in read) return <LookUnreadable why={read.refusal} />;
	const look = read.value;
	return (
		<aside className={LOOK_PANEL} data-canvas-chrome="">
			<LiveLookTokens look={look} />
			<div className="cv:flex cv:items-baseline cv:justify-between cv:gap-2">
				<span className="cv:text-base cv:font-semibold">{LOOK_TITLE}</span>
				<span className={LOOK_SAID}>{look.system}</span>
			</div>
			<SaidLine said={refusal} />
			{look.settings.map((setting) => (
				<LookRow key={setting.name} setting={setting} onPick={onPick} />
			))}
		</aside>
	);
}
