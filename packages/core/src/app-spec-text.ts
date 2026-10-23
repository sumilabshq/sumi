import type { z } from "zod";
import { parseDocument, parse as parseYaml } from "yaml";
import { AppSpecSchema, RECORD_VERBS } from "./app-spec.js";
import type { AppSpec, RecordVerb, SpecRead } from "./app-spec.js";

const FRONT_MATTER = /^\uFEFF?---(\r?\n)([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const SPEC_WITHOUT_FRONT_MATTER = "the spec holds no front matter: open it with --- and close it with ---";
const YAML_REFUSED = "the front matter is not YAML: {why}";
const NO_SUCH_FEATURE = 'the spec has no feature "{title}"';
const NO_SUCH_CHOICE = 'the spec has no choice "{name}"';
const NO_SUCH_REFERENCE = 'the spec has no reference "{product}"';
const NO_SUCH_RECORD = 'the spec has no record "{name}"';
const NOT_AN_OPTION = '"{picked}" is not one of the options of {name}: {options}';

export function readSpec(text: string): SpecRead {
	const front = text.match(FRONT_MATTER)?.[2];
	if (front === undefined) return { refusal: SPEC_WITHOUT_FRONT_MATTER };
	const yaml = yamlOf(front);
	if (yaml.refusal !== undefined) return yaml;
	const parsed = AppSpecSchema.safeParse(yaml.value);
	return parsed.success ? { spec: parsed.data } : { refusal: issueSaid(parsed.error.issues[0]) };
}

export function withFeatureToggled(text: string, title: string): string {
	const features = specOrThrow(text).features;
	const at = features.findIndex((feature) => feature.title === title);
	const feature = features[at];
	if (!feature) throw new Error(NO_SUCH_FEATURE.replace("{title}", title));
	return withFrontSet(text, ["features", at, "kept"], !feature.kept);
}

export function withChoicePicked(text: string, name: string, picked: string): string {
	const choices = specOrThrow(text).choices;
	const at = choices.findIndex((choice) => choice.name === name);
	const choice = choices[at];
	if (!choice) throw new Error(NO_SUCH_CHOICE.replace("{name}", name));
	if (!choice.options.includes(picked))
		throw new Error(
			NOT_AN_OPTION.replace("{picked}", picked)
				.replace("{name}", choice.name)
				.replace("{options}", choice.options.join(", ")),
		);
	return withFrontSet(text, ["choices", at, "picked"], picked);
}

export function withReferenceToggled(text: string, product: string): string {
	const research = specOrThrow(text).research;
	const at = research.findIndex((one) => one.product === product);
	const reference = research[at];
	if (!reference) throw new Error(NO_SUCH_REFERENCE.replace("{product}", product));
	return withFrontSet(text, ["research", at, "kept"], !reference.kept);
}

export function withRecordVerbToggled(text: string, name: string, verb: RecordVerb): string {
	const records = specOrThrow(text).records;
	const at = records.findIndex((record) => record.name === name);
	const record = records[at];
	if (!record) throw new Error(NO_SUCH_RECORD.replace("{name}", name));
	const can = record.can.includes(verb) ? record.can.filter((held) => held !== verb) : [...record.can, verb];
	return withFrontSet(
		text,
		["records", at, "can"],
		RECORD_VERBS.filter((one) => can.includes(one)),
	);
}

function issueSaid(issue: z.core.$ZodIssue | undefined): string {
	return `${issue?.path.join(".") || "the spec"}: ${issue?.message ?? "does not fit"}`;
}

type YamlRead = { readonly value: unknown; readonly refusal?: undefined } | { readonly refusal: string };

function yamlOf(front: string): YamlRead {
	try {
		const value: unknown = parseYaml(front);
		return { value };
	} catch (failure) {
		return { refusal: YAML_REFUSED.replace("{why}", failure instanceof Error ? failure.message : String(failure)) };
	}
}

function specOrThrow(text: string): AppSpec {
	const read = readSpec(text);
	if (read.refusal !== undefined) throw new Error(read.refusal);
	return read.spec;
}

function withFrontSet(text: string, path: readonly (string | number)[], value: unknown): string {
	const found = text.match(FRONT_MATTER);
	const [whole, end, front] = found ?? [];
	if (whole === undefined || end === undefined || front === undefined) throw new Error(SPEC_WITHOUT_FRONT_MATTER);
	const document = parseDocument(front);
	document.setIn(path, value);
	const written = document.toString().trimEnd().replace(/\r?\n/g, end);
	return `---${end}${written}${end}---${end}${text.slice(whole.length)}`;
}
