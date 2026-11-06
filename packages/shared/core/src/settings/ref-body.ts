import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { PopoverItem } from "@widgetarium/kit";
import type { TileProp } from "../model.js";
import { NOTHING_OFFERED, offeredEntries } from "./offered-boxes.js";
import type { OfferedEntry } from "./offered-boxes.js";
import { writeProp } from "./prop-writing.js";
import { fieldsIn, fromTileImplementationOf, withFields } from "../gateway/props.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";

export function refBody(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp): ReactElement[] {
	const wanted = spec.kind === "value" ? "value" : "collection";
	const offered = offeredEntries(state.refs).filter((entry) => entry.tile !== state.tile.id && entry.kind === wanted);
	if (offered.length === 0) return [h("p", { className: "wg-set-pop-note", key: "none" }, NOTHING_OFFERED)];
	const byTitle = new Map<string, OfferedEntry[]>();
	for (const entry of offered) byTitle.set(entry.title, [...(byTitle.get(entry.title) ?? []), entry]);
	const pick = (entry: OfferedEntry): void =>
		writeProp(state, key, spec, withFields(config, fromTileImplementationOf(spec), { ref: entry.ref }));
	const held = fieldsIn(config.fields)["ref"];
	return [...byTitle.entries()].flatMap(([title, entries]) => [
		h("p", { className: "wg-set-pop-note", key: `t${title}` }, title),
		...entries.map((entry) => pickedItem(entry.ref, entry.label, entry.ref === held, () => pick(entry))),
	]);
}

function pickedItem(key: string, label: ReactNode, checked: boolean, onClick: () => void): ReactElement {
	return h(PopoverItem, { key, checked, onClick }, [h("span", { className: "wg-set-pop-name", key: "name" }, label)]);
}
