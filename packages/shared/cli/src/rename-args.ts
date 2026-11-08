import { parseArgs } from "node:util";
import { z } from "zod";
import { parsedArgs, parsedWith, refuseExtraPositionals } from "./arg-parsing.js";
import { CliRefusal } from "./cli-output.js";

const RENAME_OPTIONS = {
	dry: { type: "boolean" },
	module: { type: "boolean" },
	plugin: { type: "boolean" },
	"skip-types": { type: "boolean" },
	strings: { type: "boolean" },
	"breaking-contract": { type: "boolean" },
} as const;

const RENAME_USAGE =
	"rename takes <full-name> <new-name>: data-framework rename file-system.files.read-folder folder, or a module or plugin name";
const ONE_KIND = "rename takes --module or --plugin, not both";

const RenameArgsSchema = z.object({
	target: z.string().min(1, RENAME_USAGE),
	to: z.string().min(1, RENAME_USAGE),
	isDry: z.boolean(),
	kind: z.enum(["module", "plugin"]).nullable(),
	isTypeChecked: z.boolean(),
	isStringRewritten: z.boolean(),
	isContractBreakAllowed: z.boolean(),
});

export type RenameArgs = z.output<typeof RenameArgsSchema>;
export type RenamedKind = NonNullable<RenameArgs["kind"]>;

export function parseRenameArgs(argv: readonly string[]): RenameArgs {
	const { values, positionals } = parsedArgs(() =>
		parseArgs({ args: [...argv], options: RENAME_OPTIONS, allowPositionals: true }),
	);
	refuseExtraPositionals(positionals, 2);
	return parsedWith(RenameArgsSchema, {
		target: positionals[0] ?? "",
		to: positionals[1] ?? "",
		isDry: values.dry === true,
		kind: kindOf(values.module === true, values.plugin === true),
		isTypeChecked: values["skip-types"] !== true,
		isStringRewritten: values.strings === true,
		isContractBreakAllowed: values["breaking-contract"] === true,
	});
}

function kindOf(isModule: boolean, isPlugin: boolean): RenamedKind | null {
	if (isModule && isPlugin) {
		throw new CliRefusal(ONE_KIND);
	}

	if (isModule) {
		return "module";
	}

	return isPlugin ? "plugin" : null;
}
