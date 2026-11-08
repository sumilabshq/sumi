import { parseArgs } from "node:util";
import { z } from "zod";
import { parsedArgs, parsedWith, refuseExtraPositionals } from "./arg-parsing.js";
import { inputSchemaOf } from "./feature-files.js";
import { CAMEL_NAME, SEGMENT_NAME, camelOf, pascalOf } from "./scaffold-names.js";

const ADD_MODULE_OPTIONS = {
	on: { type: "string" },
	in: { type: "string" },
} as const;

const ADD_FEATURE_OPTIONS = {
	query: { type: "string" },
	command: { type: "string" },
} as const;

const RESERVED_FEATURE_KEYS: readonly string[] = [
	"app",
	"server",
	"check",
	"tally",
	"started",
	"served",
	"answered",
	"sent",
	"name",
	"invalidate",
	"was",
	"now",
	"reason",
	"held",
	"constructor",
];

const MODULE_NAME_RULE = "a module name is kebab case: lowercase words of letters joined by '-' (notes, pane-tree)";
const FEATURE_RULE =
	"add feature takes <module>/<feature>, each kebab case of letters: widgetarium add feature notes/tasks";
const REQUEST_RULE =
	"--query and --command take a camelCase name of letters with no kind suffix: --query tasks, --command addTask";
const KIND_SUFFIX = /(Query|Command)$/;
const ON_RULE = "--on takes Server, Device or Anywhere: where the module may run";
const IN_RULE = "--in takes domain (a business area) or state (the app's own state)";
const RESERVED_RULE = `a feature is not named for a word its scaffold already binds: ${RESERVED_FEATURE_KEYS.join(", ")}`;
const INPUT_CLASH_RULE = "the command's input schema would take the feature's schema name: rename the command";

const RequestNameSchema = z.string().regex(CAMEL_NAME, REQUEST_RULE).refine(hasNoKindSuffix, { error: REQUEST_RULE });

const AddModuleArgsSchema = z.object({
	name: z.string().regex(SEGMENT_NAME, MODULE_NAME_RULE),
	on: z.enum(["Server", "Device", "Anywhere"], { error: ON_RULE }),
	layer: z.enum(["domain", "state"], { error: IN_RULE }),
});

const AddFeatureArgsSchema = z
	.object({
		module: z.string().regex(SEGMENT_NAME, FEATURE_RULE),
		feature: z.string().regex(SEGMENT_NAME, FEATURE_RULE),
		query: RequestNameSchema.nullable(),
		command: RequestNameSchema.nullable(),
	})
	.refine(isUnboundFeature, { error: RESERVED_RULE })
	.refine(isInputApart, { error: INPUT_CLASH_RULE });

export type AddModuleArgs = z.output<typeof AddModuleArgsSchema>;
export type AddFeatureArgs = z.output<typeof AddFeatureArgsSchema>;

export function parseAddModuleArgs(argv: readonly string[]): AddModuleArgs {
	const { values, positionals } = parsedArgs(() =>
		parseArgs({ args: [...argv], options: ADD_MODULE_OPTIONS, allowPositionals: true }),
	);
	refuseExtraPositionals(positionals, 1);
	return parsedWith(AddModuleArgsSchema, {
		name: positionals[0] ?? "",
		on: values.on,
		layer: values.in ?? "domain",
	});
}

export function parseAddFeatureArgs(argv: readonly string[]): AddFeatureArgs {
	const { values, positionals } = parsedArgs(() =>
		parseArgs({ args: [...argv], options: ADD_FEATURE_OPTIONS, allowPositionals: true }),
	);
	refuseExtraPositionals(positionals, 1);
	const segments = (positionals[0] ?? "").split("/");
	const [module = "", feature = ""] = segments.length === 2 ? segments : [];
	const isNamed = values.query !== undefined || values.command !== undefined;
	return parsedWith(AddFeatureArgsSchema, {
		module,
		feature,
		query: isNamed ? (values.query ?? null) : camelOf(feature),
		command: values.command ?? null,
	});
}

function isUnboundFeature({ feature }: { readonly feature: string }): boolean {
	return !RESERVED_FEATURE_KEYS.includes(camelOf(feature));
}

function isInputApart({ feature, command }: { readonly feature: string; readonly command: string | null }): boolean {
	return command === null || inputSchemaOf(command) !== `${pascalOf(feature)}Schema`;
}

function hasNoKindSuffix(name: string): boolean {
	return !KIND_SUFFIX.test(name);
}
