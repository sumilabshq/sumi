import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { CATALOGUE_REQUESTS } from "@widgetarium/core/engine/catalogue-requests.js";
import { useQuery } from "@widgetarium/core/requests";
import { Icon, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import { useShortcut } from "../../../../shared/lib/shortcut/use-shortcut.js";
import type { AppKind } from "../../../../shared/schema/app-tab.schema.js";
import { AppPickerQuery } from "../../contract.js";
import { pickerOrderOf } from "../../lib/source-said.js";
import { PickerRow } from "./picker-row.js";
import { PickerSearch } from "./picker-search.js";

export interface PickerPanelProps {
	readonly onAdd: (app: AppKind) => void;
	readonly onBrowse: () => void;
}

const OPEN_AN_APP = "Open an app";
const BROWSE = "Browse the catalogue";
const NO_MATCH = "No app matches “{search}”";
const HEADING = "cv:m-0 cv:flex cv:h-10 cv:items-center cv:px-3.5 cv:text-sm cv:font-semibold cv:text-ink";
const LIST =
	"cv:flex cv:max-h-[min(520px,calc(var(--wg-kit-pop-available-height,100vh)-148px))] cv:flex-col cv:overflow-y-auto";
const EMPTY = "cv:m-0 cv:px-3.5 cv:py-3 cv:text-sm cv:text-muted-foreground";

export function PickerPanel({ onAdd, onBrowse }: PickerPanelProps): ReactElement {
	const [search, setSearch] = useState("");
	const panel = useRef<HTMLDivElement | null>(null);
	const field = useRef<HTMLInputElement | null>(null);
	const { mine, builtIn } = useQuery(AppPickerQuery, { search }).data;
	const apps = pickerOrderOf(mine, builtIn);
	useShortcut(panel, {
		key: "k",
		isShifted: false,
		onPress: () => field.current?.focus(),
	});
	return (
		<div ref={panel} role="dialog" aria-label={OPEN_AN_APP} data-host-app-picker="">
			<p className={HEADING}>{OPEN_AN_APP}</p>
			<PickerSearch field={field} search={search} onSearch={setSearch} />
			<div className={LIST}>
				{apps.map((app) => (
					<PickerRow key={`${app.kind}:${app.id}`} app={app} onAdd={onAdd} />
				))}
				{apps.length === 0 ? (
					<p className={EMPTY} data-host-picker-empty="">
						{NO_MATCH.replace("{search}", search.trim())}
					</p>
				) : null}
			</div>
			<PopoverSeparator />
			<PopoverItem
				onClick={() => {
					onBrowse();
					void CATALOGUE_REQUESTS.ask({ mode: "browse" });
				}}
				data-host-picker-browse=""
			>
				<Icon name="store" size={16} />
				{BROWSE}
			</PopoverItem>
		</div>
	);
}
