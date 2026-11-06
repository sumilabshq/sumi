import { createElement as h } from "react";
import type { ReactElement } from "react";
import { NativeSelect, NativeSelectOption, Segmented } from "@widgetarium/kit";
import type { OutputOf } from "@widgetarium/framework";
import type { LookPanelQuery } from "@widgetarium/canvas";

type LookRowShown = Extract<OutputOf<typeof LookPanelQuery>, { kind: "look" }>["rows"][number];

export interface LookRowProps {
	readonly row: LookRowShown;
	readonly onPick: (option: string) => void;
}

const REDRAWN_HINT = "The assistant draws this into the next screens";
const SAID = "cv:text-xs cv:text-muted-foreground";

export function LookRow({ row, onPick }: LookRowProps): ReactElement {
	return (
		<div className="cv:flex cv:flex-col cv:items-start cv:gap-1.5">
			<span className="cv:text-sm cv:text-ink">{row.label}</span>
			{row.isSegmented ? (
				<Segmented<string>
					size="s"
					items={row.options.map((option) => ({ value: option, label: option }))}
					value={row.picked}
					onValueChange={onPick}
				/>
			) : (
				<NativeSelect value={row.picked} onValueChange={onPick} aria-label={row.label}>
					{row.options.map((option) => (
						<NativeSelectOption key={option} value={option}>
							{option}
						</NativeSelectOption>
					))}
				</NativeSelect>
			)}
			{row.suggested ? <span className={SAID}>{row.suggested}</span> : null}
			{row.isRedrawn ? <span className={SAID}>{REDRAWN_HINT}</span> : null}
		</div>
	);
}
