import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { TileProp } from "../model.js";
import { bindingOf, declaredOf, fieldsIn, typedIn } from "../gateway/props.js";
import type { PropBinding } from "../gateway/props.js";
import { hostGatewayFor } from "../engine/host-gateways.js";
import { problemsOf } from "../gateway/problems.js";
import { refOf } from "../gateway/refs.js";
import { isShown } from "../prop-visibility.js";
import { implementationBody, implementationLabel } from "./implementation-body.js";
import { refLabel } from "./offered-boxes.js";
import { ProblemsMark } from "./problems-mark.js";
import { isSwitched, propConfigOf, writtenText } from "./prop-writing.js";
import { editorPopover, group, valueRow, withHelp } from "./settings-rows.js";
import type { SettingsManifest, SettingsSpec, SettingsState } from "./settings-state.js";
import { sourceButton, sourceList, sourcesOpenKey } from "./source-list.js";
import { choiceBody, chosenLabel, pickedRowValue, switchedValue, typedBody, typedLabel } from "./typed-body.js";
import { itemBody, itemRows, listedFields, openedItem } from "./typed-rows.js";
import { refBody } from "./ref-body.js";

const TYPED_ITEMS = "The items live in this tile.";

const TYPED_VALUE = "The value lives in this tile.";

const FROM_ANOTHER = "Reads another widget on this board, and the two move together.";

const OWN_BOX_NOTE = "This widget keeps the pick to itself until you bind it.";

type DrawnFor<Drawn> = (state: SettingsState, prop: SettingsProp) => Drawn;

const LABEL_OF_BINDING: Readonly<Record<PropBinding, DrawnFor<string>>> = {
	implementation: (state, prop) => implementationLabel(state, prop),
	memory: (state, prop) => implementationLabel(state, prop),
	box: () => "Its own",
	ref: (state, { config }) => refLabel(state, fieldsIn(config.fields)["ref"]),
	hardcode: (_state, { spec, config }) => typedLabel(spec, config),
};

const BODY_OF_BINDING: Readonly<Record<PropBinding, DrawnFor<ReactNode[]>>> = {
	implementation: (state, prop) => implementationBody(state, prop),
	memory: (state, prop) => implementationBody(state, prop),
	box: () => [],
	ref: (state, { key, spec, config }) => refBody(state, key, spec, config),
	hardcode: (state, prop) => typedBodyOf(state, prop),
};

export interface SettingsProp {
	readonly key: string;
	readonly spec: SettingsSpec;
	readonly config: TileProp;
	readonly binding: PropBinding;
}

export type DeclaredEntry = readonly [string, SettingsSpec];

export function propRow(state: SettingsState, prop: SettingsProp): ReactElement {
	const { key, spec, config, binding } = prop;
	const at = listedFields(spec, binding) ? openedItem(state.openRow, key) : null;
	const under = at === null ? propBody(state, prop) : itemBody(state, key, spec, config, at);
	const seed = binding === "hardcode" ? writtenText(spec, typedIn(spec, config) ?? declaredOf(spec)) : "";
	const body = h("div", { className: "wg-set-pop-body" }, under);
	return editorPopover(state, `prop:${key}`, propTrigger(state, prop), body, seed, isOnAStep(state, prop, at));
}

export function boundProp(state: SettingsState, key: string, spec: SettingsSpec): SettingsProp {
	const config = propConfigOf(state, key, spec);
	return { key, spec, config, binding: bindingOf(spec, config).binding };
}

export function declaredProps(manifest: SettingsManifest, wanted: (spec: SettingsSpec) => boolean): DeclaredEntry[] {
	return Object.entries(manifest.props ?? {}).filter(([, spec]) => wanted(spec));
}

export function propGroup(state: SettingsState): ReactElement | null {
	const declared = declaredProps(state.manifest, (spec) => spec.design !== true)
		.filter(([key]) => !state.fed.includes(key))
		.filter(([, spec]) => isShown(spec, state.seen));
	if (declared.length === 0) return null;
	const rows = declared.map(([key, spec]) => propRow(state, boundProp(state, key, spec)));
	return group("props", declared.length > 1 ? "Sources" : "Source", rows, null);
}

function kindNote(spec: SettingsSpec, binding: PropBinding): string {
	if (binding === "box") return OWN_BOX_NOTE;
	if (binding === "ref") return FROM_ANOTHER;
	return spec.kind === "value" ? TYPED_VALUE : TYPED_ITEMS;
}

function propHead(state: SettingsState, prop: SettingsProp): ReactElement {
	const { key, spec, config, binding } = prop;
	const said = isPackBinding(binding) ? hostGatewayFor(spec, config)?.description : kindNote(spec, binding);
	return h("div", { className: "wg-set-pop-headline", key: "head" }, [
		h("div", { className: "wg-set-pop-head", key: "said" }, [
			h("span", { className: "wg-set-pop-title", key: "title" }, withHelp(spec.label ?? key, spec.hint ?? said)),
		]),
		state.refs
			? h(ProblemsMark, { key: "problems", store: problemsOf(state.refs), propRef: refOf(state.tile.id, key) })
			: null,
		sourceButton(state, key, spec),
	]);
}

function boundLabel(state: SettingsState, prop: SettingsProp): string {
	return LABEL_OF_BINDING[prop.binding](state, prop);
}

function bindingBody(state: SettingsState, prop: SettingsProp): ReactNode[] {
	return BODY_OF_BINDING[prop.binding](state, prop);
}

function typedBodyOf(state: SettingsState, { key, spec, config, binding }: SettingsProp): ReactNode[] {
	if (isSwitched(spec)) return [];
	if (spec.options) return choiceBody(state, key, spec, config);
	return listedFields(spec, binding) ? itemRows(state, key, spec, config) : typedBody(state, key, spec, config);
}

function propValue(state: SettingsState, prop: SettingsProp, switched: boolean): ReactElement {
	const { key, spec, config, binding } = prop;
	if (switched) return switchedValue(state, key, spec, config);
	if (spec.options && binding === "hardcode") return h("span", { className: "wg-set-path" }, chosenLabel(spec, config));
	return pickedRowValue(spec, config, binding) ?? h("span", { className: "wg-set-path" }, boundLabel(state, prop));
}

function propTrigger(state: SettingsState, prop: SettingsProp): ReactElement {
	const { key, spec, binding } = prop;
	const switched = isSwitched(spec) && binding === "hardcode";
	return valueRow({
		label: spec.label ?? key,
		value: propValue(state, prop, switched),
		unset: !switched && !spec.options && !isChosen(prop),
	});
}

function isChosen({ spec, config, binding }: SettingsProp): boolean {
	if (typedIn(spec, config) !== undefined || fieldsIn(config.fields)["ref"]) return true;
	return isPackBinding(binding) && typeof config.implementation === "string";
}

function isPackBinding(binding: PropBinding): boolean {
	return binding === "implementation" || binding === "memory";
}

function propBody(state: SettingsState, prop: SettingsProp): ReactNode[] {
	const { key, spec, config } = prop;
	const head = propHead(state, prop);
	if (state.openRow === sourcesOpenKey(key)) return [head, ...sourceList(state, key, spec, config)];
	return [head, ...bindingBody(state, prop)];
}

function isOnAStep(state: SettingsState, { key }: SettingsProp, at: number | null): boolean {
	return at !== null || state.openRow === sourcesOpenKey(key);
}
