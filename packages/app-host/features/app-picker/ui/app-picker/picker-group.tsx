import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { PickerApp } from "../../contract.js";
import { PickerRow } from "./picker-row.js";
import type { AppKind } from "../../../../shared/schema/app-tab.schema.js";

export interface PickerGroupProps {
	readonly title: string;
	readonly said: string;
	readonly apps: readonly PickerApp[];
	readonly onAdd: (app: AppKind) => void;
}

const HEADING =
	"cv:m-0 cv:flex cv:items-center cv:gap-2 cv:px-3.5 cv:pt-2.5 cv:pb-1 cv:text-xs cv:font-medium cv:text-muted-foreground/65";

export function PickerGroup({ title, said, apps, onAdd }: PickerGroupProps): ReactElement | null {
	if (apps.length === 0) {
		return null;
	}

	return (
		<div role="group" className="cv:contents" data-host-picker-group={title}>
			<p className={HEADING}>
				{title}
				<span className="cv:font-normal">{said}</span>
			</p>
			{apps.map((app) => (
				<PickerRow key={`${app.kind}:${app.id}`} app={app} onAdd={onAdd} />
			))}
		</div>
	);
}
