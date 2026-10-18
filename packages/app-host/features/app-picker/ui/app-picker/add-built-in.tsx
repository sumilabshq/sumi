import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { Tip } from "@widgetarium/canvas";
import { Icon } from "@widgetarium/kit";
import type { PickerApp } from "../../contract.js";
import type { AppKind } from "../../../../shared/schema/app-tab.schema.js";

export interface AddBuiltInProps {
	readonly app: Extract<PickerApp, { readonly kind: "built-in" }>;
	readonly onAdd: (app: AppKind) => void;
}

const ADD = "Add";
const ADD_SAID = "Add {name}";
const ADD_TIP = "Open a new {name} tab";
const OPEN_COUNT = "{count} open";
const ADD_PILL =
	"cv:inline-flex cv:h-10 cv:flex-none cv:cursor-pointer cv:items-center cv:gap-1.5 cv:rounded-full cv:border-0 cv:bg-fill cv:px-4 cv:text-[13px] cv:font-medium cv:text-ink cv:shadow-none cv:group-hover:bg-primary cv:group-hover:text-primary-foreground cv:focus-visible:outline-2 cv:focus-visible:outline-ring";
const COUNT =
	"cv:inline-flex cv:h-10 cv:flex-none cv:items-center cv:gap-1.5 cv:px-1 cv:text-[13px] cv:text-muted-foreground";
const COUNT_DOT = "cv:size-[7px] cv:rounded-full cv:bg-success";

export function AddBuiltIn({ app, onAdd }: AddBuiltInProps): ReactElement {
	return (
		<>
			{app.openCount === 0 ? null : (
				<span className={COUNT} data-host-picker-count={app.openCount}>
					<span aria-hidden="true" className={COUNT_DOT} />
					{OPEN_COUNT.replace("{count}", String(app.openCount))}
				</span>
			)}
			<Tip label={ADD_TIP.replace("{name}", app.name)}>
				<button
					type="button"
					className={ADD_PILL}
					aria-label={ADD_SAID.replace("{name}", app.name)}
					onClick={() => onAdd(app.app)}
					data-host-new-tab={app.app}
				>
					<Icon name="plus" size={14} />
					{ADD}
				</button>
			</Tip>
		</>
	);
}
