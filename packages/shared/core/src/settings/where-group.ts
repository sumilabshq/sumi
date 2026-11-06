import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Pill, Row, RowLabel, RowValue } from "@widgetarium/kit";
import type { TileProp } from "../model.js";
import { bindingOf, declaredOf, typedIn } from "../gateway/props.js";
import { storedRows } from "../gateway/kept-in-tile.js";
import { valueIn } from "../gateway/create.js";
import { fieldsOf } from "../gateway/fields.js";
import type { FilterRow } from "@widgetarium/framework/gateway/contract";
import { WHERE_FIELD, conditionBody, conditionRowsIn, conditionSentence, keepRow, stepAt } from "./condition-steps.js";
import type { ConditionAt, ConditionField, RowIndex } from "./condition-steps.js";
import { boxRows, offeredBoxes } from "./offered-boxes.js";
import { editorPopover, group, note, valueRow } from "./settings-rows.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";

const PICK_SPREAD = "Everything a filter has picked arrives as conditions of its own.";

const WHERE_HINT = "These decide which data arrives. A condition the widget declares cannot be edited here.";

type Fields = readonly ConditionField[];

export function whereGroup(
	state: SettingsState,
	key: string,
	spec: SettingsSpec,
	config: TileProp,
): ReactElement {
	const fields = fieldsFor(spec, config);
	const held = conditionRowsIn(config);
	const rows = held.filter((row) => row.fixed !== true);
	const open = stepAt(state.openRow, key);
	const at = (index: RowIndex): ConditionAt => ({
		key,
		config,
		rows,
		index,
		step: open?.index === String(index) ? open.step : null,
	});
	const drawn = [
		...held.filter((row) => row.fixed === true).map((row, index) => fixedCondition(state, fields, row, index)),
		...rows.map((row, index) =>
			conditionRow(state, at(index), fields, valueRow({ label: conditionSentence(state, fields, row), value: "" })),
		),
		conditionRow(state, at(rows.length), fields, addRow("Add condition")),
	];
	if (offeredBoxes(state, "conditions").size > 0) {
		drawn.push(conditionRow(state, at("spread"), fields, addRow("Everything a filter has picked")));
	}
	return group(
		`${WHERE_FIELD}:${key}`,
		`Where · ${spec.label ?? key}`,
		drawn,
		WHERE_HINT,
	);
}

function fieldsFor(spec: SettingsSpec, config: TileProp): Fields {
	if (bindingOf(spec, config).binding !== "hardcode") return [];
	return fieldsOf(storedRows(typedIn(spec, config) ?? declaredOf(spec)).map(valueIn));
}

function spreadBody(state: SettingsState, at: ConditionAt): ReactElement[] {
	return [
		note(PICK_SPREAD),
		...boxRows(state, "conditions", (entry) => keepRow(state, at, { spread: { ref: entry.ref } }, null)),
	];
}

function conditionRow(state: SettingsState, at: ConditionAt, fields: Fields, trigger: ReactElement): ReactElement {
	const body = at.index === "spread" ? spreadBody(state, at) : conditionBody(state, at, fields, at.step ?? "");
	return editorPopover(
		state,
		`${WHERE_FIELD}:${at.key}#${at.index}`,
		trigger,
		h("div", { className: "wg-set-pop-body" }, body),
		"",
		at.step !== null,
	);
}

function fixedCondition(state: SettingsState, fields: Fields, row: FilterRow, index: number): ReactElement {
	return h(Row, { className: "wg-set-row", key: `fixed${index}` }, [
		h(RowLabel, { key: "label" }, conditionSentence(state, fields, row)),
		h(RowValue, { className: "wg-set-value", key: "value" }, h(Pill, null, "Fixed")),
	]);
}

function addRow(said: string): ReactElement {
	return h(Row, { className: "wg-set-row is-add", pressable: true }, [
		h(Icon, { name: "plus", key: "plus" }),
		h(RowLabel, { key: "label" }, said),
	]);
}
