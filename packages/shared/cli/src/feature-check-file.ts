import { featureNamesOf, requestNamesOf, shortNameOf, type FeatureNames, type FeatureSeed } from "./feature-files.js";
import { memoryPartsOf, moduleConstOf, pickerPathOf, type ModulePlacement } from "./module-files.js";
import { COMMAND_SUFFIX, FRAMEWORK, QUERY_SUFFIX } from "./scaffold-names.js";

export interface CheckedFeature {
	readonly module: string;
	readonly folder: string;
	readonly placement: ModulePlacement;
	readonly seed: FeatureSeed;
}

interface CheckPlan extends CheckedFeature {
	readonly names: FeatureNames;
	readonly isServer: boolean;
	readonly moduleConst: string;
}

const SERVER_URL = "http://checks.test";

export function checkFileOf(module: string, feature: string): string {
	return `tools/${module}-${feature}-checks.ts`;
}

export function checkTextOf(checked: CheckedFeature): string {
	const plan = {
		...checked,
		names: featureNamesOf(checked.seed.feature),
		isServer: checked.placement === "Server",
		moduleConst: moduleConstOf(checked.module),
	};
	const { seed } = checked;
	const title = `${checked.module} ${seed.feature}`;
	return [
		...importsOf(plan),
		"",
		...startOf(plan),
		...(seed.query === null ? [] : ["", ...queryCheckOf(seed.query, plan.names)]),
		...(seed.command === null ? [] : ["", ...commandCheckOf(seed.command, plan.names)]),
		"",
		`console.log(tally.failed ? \`${title}: \${tally.failed} check(s) failed\` : "${title}: all checks passed");`,
		"process.exit(tally.failed ? 1 : 0);",
		"",
	].join("\n");
}

function importsOf({ module, folder, seed, names, isServer, moduleConst }: CheckPlan): string[] {
	const contract = [...(isServer ? [moduleConst] : []), ...requestNamesOf(seed)].sort();
	const runnable = isServer ? `${moduleConst} as Runnable${moduleConst}` : moduleConst;
	return [
		`import { ${isServer ? "Authenticate, orpcTransport, " : ""}runtime${isServer ? ", type User" : ""} } from "${FRAMEWORK}";`,
		...(isServer ? [`import { dataFrameworkMiddleware } from "${FRAMEWORK}/server";`] : []),
		`import { ${contract.join(", ")} } from "../${folder}/index.ts";`,
		`import { ${memoryPartsOf(module)} } from "../${folder}/${pickerPathOf(module)}";`,
		`import { ${names.memoryGateway} } from "../${folder}/${names.memoryFile}";`,
		`import { ${runnable} } from "../${folder}/module.ts";`,
		'import { check, tally } from "./check-helpers.ts";',
	];
}

function startOf({ module, names, isServer, moduleConst }: CheckPlan): string[] {
	const fakes = [
		`${isServer ? `Runnable${moduleConst}` : moduleConst}({`,
		"\tinjects: {",
		`\t\t...${memoryPartsOf(module)}(),`,
		`\t\t${names.key},`,
		"\t},",
		"})",
	];
	return [
		`const ${names.key} = new ${names.memoryGateway}({`,
		'\tnames: ["first"],',
		"});",
		...(isServer ? serverStartOf(moduleConst, fakes) : localStartOf(fakes)),
	];
}

function localStartOf(fakes: readonly string[]): string[] {
	return ["const started = runtime()", "\t.modules(", ...fakes.map((line) => `\t${line}`), "\t)", "\t.start();"];
}

function serverStartOf(moduleConst: string, fakes: readonly string[]): string[] {
	return [
		"",
		"const CHECKER: User = {",
		'\tid: "checker",',
		"\tpermissions: [],",
		"};",
		"",
		"class CheckerAuthenticate extends Authenticate {",
		"\toverride async userOf(): Promise<User | null> {",
		"\t\treturn CHECKER;",
		"\t}",
		"}",
		"",
		"const served = dataFrameworkMiddleware(",
		"\truntime()",
		"\t\t.modules(",
		...fakes.map((line) => `\t\t${line}`),
		"\t\t)",
		'\t\t.start({ platform: "server", env: {} }),',
		"\t{ authenticate: new CheckerAuthenticate() },",
		");",
		"const started = runtime()",
		`\t.imports(${moduleConst}({ over: orpcTransport("${SERVER_URL}", { fetch: served.fetch }) }))`,
		"\t.start();",
	];
}

function queryCheckOf(query: string, { key }: FeatureNames): string[] {
	const what = `${shortNameOf(query, QUERY_SUFFIX)} answers what the ${key} gateway holds`;
	return [
		`const answered = await started.send(${query});`,
		`check("${what}", answered.ok ? answered.output : answered.reason, {`,
		'\tnames: ["first"],',
		"});",
	];
}

function commandCheckOf(command: string, { key }: FeatureNames): string[] {
	const what = `${shortNameOf(command, COMMAND_SUFFIX)} saves through the ${key} gateway and answers what it saved`;
	return [
		`const sent = await started.send(${command}, { name: "second" });`,
		`check("${what}", [sent.ok ? sent.output : sent.reason, ${key}.${key}()], [`,
		"\t{",
		'\t\tnames: ["first", "second"],',
		"\t},",
		"\t{",
		'\t\tnames: ["first", "second"],',
		"\t},",
		"]);",
	];
}
