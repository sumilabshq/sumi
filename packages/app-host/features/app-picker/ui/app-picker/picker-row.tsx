import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, PopoverItem } from "@widgetarium/kit";
import type { AppKind } from "../../../../shared/schema/app-tab.schema.js";
import type { PickerApp } from "../../contract.js";
import { sourceSaidOf } from "../../lib/source-said.js";

export interface PickerRowProps {
	readonly app: PickerApp;
	readonly onAdd: (app: AppKind) => void;
}

const DISC =
	"cv:-ms-1.5 cv:grid cv:size-7 cv:flex-none cv:place-items-center cv:rounded-full cv:text-ink cv:shadow-[inset_0_0_0_1px_var(--wg-studio-glass-edge,var(--border))]";
const SOURCE = "wg-kit-menu-shortcut";

export function PickerRow({ app, onAdd }: PickerRowProps): ReactElement {
	return (
		<PopoverItem
			// TODO: open the person's own app as a host tab; app-host has no tab kind for it yet
			disabled={app.kind !== "built-in"}
			onClick={() => {
				if (app.kind === "built-in") onAdd(app.app);
			}}
			data-host-picker-row={app.id}
			data-host-picker-kind={app.kind}
			data-host-new-tab={app.kind === "built-in" ? app.app : undefined}
		>
			<span className={DISC} data-host-picker-disc="">
				<Icon name={app.icon} size={15} />
			</span>
			<span data-host-picker-name="">{app.name}</span>
			<span className={SOURCE} data-host-picker-source="">
				{sourceSaidOf(app)}
			</span>
		</PopoverItem>
	);
}
