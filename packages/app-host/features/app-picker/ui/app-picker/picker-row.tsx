import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { PickerApp } from "../../contract.js";
import { PermitChip } from "./permit-chip.js";
import { PickerRowEnd } from "./picker-row-end.js";
import type { AppKind } from "../../../../shared/schema/app-tab.schema.js";

export interface PickerRowProps {
	readonly app: PickerApp;
	readonly onAdd: (app: AppKind) => void;
}

const BETA = "Beta";
const ROW =
	"cv:box-border cv:flex cv:min-h-[60px] cv:items-center cv:gap-3 cv:rounded-[30px] cv:py-[7px] cv:ps-[7px] cv:pe-2";
const ROW_LOOK: Readonly<Record<PickerApp["kind"], string>> = {
	"built-in": `${ROW} cv:group cv:hover:bg-fill`,
	mine: `${ROW} cv:group cv:hover:bg-fill`,
	planned: `${ROW} cv:opacity-45`,
};
const DISC = "cv:grid cv:size-11 cv:flex-none cv:place-items-center cv:rounded-full";
const DISC_LOOK: Readonly<Record<PickerApp["kind"], string>> = {
	"built-in": `${DISC} cv:bg-fill cv:text-ink cv:group-hover:bg-raise`,
	mine: `${DISC} cv:bg-primary cv:text-primary-foreground`,
	planned: `${DISC} cv:bg-fill cv:text-ink`,
};
const WORDS = "cv:flex cv:min-w-0 cv:flex-1 cv:flex-col cv:gap-[5px]";
const FIRST_LINE = "cv:flex cv:min-w-0 cv:items-center cv:gap-2 cv:whitespace-nowrap";
const NAME = "cv:flex-none cv:text-[14px] cv:leading-[18px] cv:font-semibold cv:tracking-[-0.01em] cv:text-ink";
const DESCRIPTION = "cv:min-w-0 cv:truncate cv:text-xs cv:text-muted-foreground";
const BADGE =
	"cv:inline-flex cv:h-[22px] cv:flex-none cv:items-center cv:rounded-full cv:bg-accent-wash cv:px-2 cv:text-[11px] cv:font-medium cv:text-brand";
const CHIPS = "cv:flex cv:gap-1 cv:overflow-hidden";

export function PickerRow({ app, onAdd }: PickerRowProps): ReactElement {
	return (
		<div
			className={ROW_LOOK[app.kind]}
			aria-disabled={app.kind === "planned" || undefined}
			data-host-picker-row={app.id}
			data-host-picker-kind={app.kind}
		>
			<span className={DISC_LOOK[app.kind]} data-host-picker-disc="">
				<Icon name={app.icon} size={19} />
			</span>
			<div className={WORDS}>
				<div className={FIRST_LINE}>
					<span className={NAME} data-host-picker-name="">
						{app.name}
					</span>
					{app.isBeta ? <span className={BADGE}>{BETA}</span> : null}
					<span className={DESCRIPTION} data-host-picker-description="">
						{app.description}
					</span>
				</div>
				{app.permits.length === 0 ? null : (
					<div className={CHIPS}>
						{app.permits.map((permit) => (
							<PermitChip key={permit.kind} permit={permit} />
						))}
					</div>
				)}
			</div>
			<PickerRowEnd app={app} onAdd={onAdd} />
		</div>
	);
}
