import { createElement as h } from "react";
import type { ReactElement } from "react";
import { NativeSelect, NativeSelectOption, Segmented } from "@widgetarium/kit";
import type { LookSetting } from "../../../schemas/look.schema.js";
import { isSettingDrawnLive } from "../lib/look-tokens.js";
import type { LookPicked } from "./look-panel.js";

const SUGGESTED_HINT = "Suggested: {option}";
const REDRAWN_HINT = "The assistant draws this into the next screens";
const SEGMENTS_AT_MOST = 3;
const SAID = "cv:text-xs cv:text-muted-foreground";

export function LookRow({
	setting,
	onPick,
}: {
	readonly setting: LookSetting;
	readonly onPick: LookPicked;
}): ReactElement {
	const pick = (option: string): void => onPick(setting.name, option);
	return (
		<div className="cv:flex cv:flex-col cv:items-start cv:gap-1.5">
			<span className="cv:text-sm cv:text-ink">{setting.ask ?? setting.name}</span>
			{setting.options.length <= SEGMENTS_AT_MOST ? (
				<Segmented<string>
					size="s"
					items={setting.options.map((option) => ({ value: option, label: option }))}
					value={setting.picked}
					onValueChange={pick}
				/>
			) : (
				<NativeSelect value={setting.picked} onValueChange={pick} aria-label={setting.ask ?? setting.name}>
					{setting.options.map((option) => (
						<NativeSelectOption key={option} value={option}>
							{option}
						</NativeSelectOption>
					))}
				</NativeSelect>
			)}
			{setting.picked !== setting.recommended ? (
				<span className={SAID}>{SUGGESTED_HINT.replace("{option}", setting.recommended)}</span>
			) : null}
			{isSettingDrawnLive(setting.name) ? null : <span className={SAID}>{REDRAWN_HINT}</span>}
		</div>
	);
}
