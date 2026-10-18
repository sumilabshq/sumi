import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { useShortcut } from "../../../../shared/lib/shortcut/use-shortcut.js";
import { AppPickerQuery } from "../../contract.js";
import { PickerGroup } from "./picker-group.js";
import { PickerSearch } from "./picker-search.js";
import type { AppKind } from "../../../../shared/schema/app-tab.schema.js";

export interface PickerPanelProps {
	readonly onAdd: (app: AppKind) => void;
}

const MY_APPS = "My apps";
const MY_APPS_SAID = "built by you";
const BUILT_IN = "Built in";
const BUILT_IN_SAID = "ordinary apps, same rules as yours";
const NO_MATCH = "No app matches “{search}”";
const PANEL = "cv:flex cv:flex-col cv:gap-1";
const LIST = "cv:flex cv:max-h-[min(780px,calc(100vh-180px))] cv:flex-col cv:gap-1 cv:overflow-y-auto";
const EMPTY = "cv:m-0 cv:px-3.5 cv:py-4 cv:text-sm cv:text-muted-foreground";

export function PickerPanel({ onAdd }: PickerPanelProps): ReactElement {
	const [search, setSearch] = useState("");
	const panel = useRef<HTMLDivElement | null>(null);
	const field = useRef<HTMLInputElement | null>(null);
	const { mine, builtIn } = useQuery(AppPickerQuery, { search }).data;
	useShortcut(panel, {
		key: "k",
		onPress: () => field.current?.focus(),
	});
	return (
		<div ref={panel} className={PANEL} data-host-app-picker="">
			<PickerSearch field={field} search={search} onSearch={setSearch} />
			<div className={LIST}>
				<PickerGroup title={MY_APPS} said={MY_APPS_SAID} apps={mine} onAdd={onAdd} />
				<PickerGroup title={BUILT_IN} said={BUILT_IN_SAID} apps={builtIn} onAdd={onAdd} />
				{mine.length + builtIn.length === 0 ? (
					<p className={EMPTY} data-host-picker-empty="">
						{NO_MATCH.replace("{search}", search.trim())}
					</p>
				) : null}
			</div>
		</div>
	);
}
