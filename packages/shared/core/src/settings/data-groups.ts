import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Row, RowLabel, RowValue, Switch } from "@widgetarium/kit";
import type { TileProp } from "../model.js";
import { allowedVerbs, bindingOf, fieldsIn } from "../gateway/props.js";
import type { PropBinding } from "../gateway/props.js";
import { sortRowsIn } from "../engine/held-reading.js";
import { propConfigOf, writeProp } from "./prop-writing.js";
import { group, reportRow, titleCase } from "./settings-rows.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";
import { whereGroup } from "./where-group.js";

const VERBS_SWITCHED_HERE = "Switch one off and this tile can no longer do it, whatever the widget asks for.";

const TYPED_VERB_SAYINGS: ReadonlyMap<string, string> = new Map([
	["list", "reads this widget's own list"],
	["get", "reads one record"],
	["create", "adds a row to this widget's own list"],
	["update", "rewrites a row in this widget's own list"],
	["remove", "drops a row from this widget's own list"],
]);

const NO_SAYINGS: ReadonlyMap<string, string> = new Map();

interface DataProp {
	readonly key: string;
	readonly spec: SettingsSpec;
	readonly config: TileProp;
	readonly label: string;
	readonly binding: PropBinding;
}

export function dataGroups(state: SettingsState): ReactElement[] {
	const groups = Object.entries(state.manifest.props ?? {}).flatMap(([key, spec]) =>
		propDataGroups(state, dataPropOf(state, key, spec)),
	);
	if (groups.length > 0) return groups;
	return [
		group(
			"no-data",
			"Data",
			h(Row, { className: "wg-set-row" }, h(RowLabel, null, "This widget declares no source")),
			null,
		),
	];
}

function dataPropOf(state: SettingsState, key: string, spec: SettingsSpec): DataProp {
	const config = propConfigOf(state, key, spec);
	return { key, spec, config, label: spec.label ?? key, binding: bindingOf(spec, config).binding };
}

function propDataGroups(state: SettingsState, prop: DataProp): ReactElement[] {
	const { key, spec, config } = prop;
	const groups: ReactElement[] = [];
	if (spec.kind !== "value" && !spec.source) groups.push(whereGroup(state, key, spec, config));
	const sorted = sortGroup(prop);
	if (sorted) groups.push(sorted);
	groups.push(verbsGroup(state, prop));
	return groups;
}

function sortGroup({ key, spec, config, label }: DataProp): ReactElement | null {
	const sort = [...(spec.sort ?? []), ...sortRowsIn(fieldsIn(config.fields)["sort"])];
	if (sort.length === 0) return null;
	return group(
		`sort:${key}`,
		`Sort · ${label}`,
		sort.map((row, index) =>
			h(Row, { className: "wg-set-row", key: index }, [
				h(RowLabel, { key: "label" }, row.prop),
				h(RowValue, { className: "wg-set-value", key: "value" }, row.dir === "desc" ? "Descending" : "Ascending"),
			]),
		),
		null,
	);
}

function verbsGroup(state: SettingsState, prop: DataProp): ReactElement {
	const { key, spec, config, label, binding } = prop;
	const decisions = allowedVerbs(spec, config);
	const verbsSwitchedOn = decisions.filter((decision) => decision.can).map((decision) => decision.verb);
	const flipVerb =
		(verb: string) =>
		(next: boolean): void =>
			writeProp(state, key, spec, {
				...config,
				allow: next ? [...new Set([...verbsSwitchedOn, verb])] : verbsSwitchedOn.filter((held) => held !== verb),
			});
	const said = binding === "hardcode" ? TYPED_VERB_SAYINGS : NO_SAYINGS;
	return group(
		`can:${key}`,
		`What ${label} can do`,
		decisions.map(({ verb, can }) =>
			reportRow(
				verb,
				titleCase(verb),
				said.get(verb) ?? `runs "${verb}" on this source`,
				h(Switch, { checked: can, label: titleCase(verb), onChange: flipVerb(verb) }),
				can,
			),
		),
		VERBS_SWITCHED_HERE,
	);
}
