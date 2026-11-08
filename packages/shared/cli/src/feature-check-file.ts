import { featureNamesOf, type FeatureNames, type FeatureSeed } from "./feature-files.js";
import { memoryPartsOf, moduleConstOf, pickerPathOf, type ModulePlacement } from "./module-files.js";
import { FRAMEWORK, camelOf, kebabOf } from "./scaffold-names.js";

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
	readonly held: string;
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
		held: `kept${featureNamesOf(checked.seed.feature).record}`,
	};
	const featureOf = (request: string): string => `${plan.moduleConst}.${camelOf(checked.seed.feature)}.${request}`;
	const { seed } = checked;
	const title = `${checked.module} ${seed.feature}`;
	return [
		...importsOf(plan),
		"",
		...startOf(plan),
		...(seed.query === null ? [] : ["", ...queryCheckOf(seed.query, featureOf(seed.query), plan)]),
		...(seed.command === null ? [] : ["", ...commandCheckOf(seed.command, featureOf(seed.command), plan)]),
		"",
		`console.log(tally.failed ? \`${title}: \${tally.failed} check(s) failed\` : "${title}: all checks passed");`,
		"process.exit(tally.failed ? 1 : 0);",
		"",
	].join("\n");
}

function importsOf({ module, folder, names, isServer, moduleConst }: CheckPlan): string[] {
	return [
		`import { ${isServer ? "Authenticate, orpcTransport, " : ""}runtime${isServer ? ", type User" : ""} } from "${FRAMEWORK}";`,
		...(isServer ? [`import { dataFrameworkMiddleware } from "${FRAMEWORK}/server";`] : []),
		`import { ${moduleConst} } from "../${folder}/index.ts";`,
		`import { ${memoryPartsOf(module)} } from "../${folder}/${pickerPathOf(module)}";`,
		`import { ${names.memoryGateway} } from "../${folder}/${names.memoryFile}";`,
		`import { ${moduleConst} as ${moduleConst}Module } from "../${folder}/module.ts";`,
		'import { check, tally } from "./check-helpers.ts";',
	];
}

function startOf({ module, names, isServer, moduleConst, held }: CheckPlan): string[] {
	const fakes = [
		`${moduleConst}Module({`,
		"\tinjects: {",
		`\t\t...${memoryPartsOf(module)}(),`,
		`\t\t${names.key}: ${held},`,
		"\t},",
		"})",
	];
	return [
		`const ${held} = new ${names.memoryGateway}({`,
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

function queryCheckOf(query: string, sent: string, { names }: CheckPlan): string[] {
	const what = `${kebabOf(query)} answers what the ${names.key} gateway holds`;
	return [
		`const answered = await started.send(${sent});`,
		`check("${what}", answered.ok ? answered.output : answered.reason, {`,
		'\tnames: ["first"],',
		"});",
	];
}

function commandCheckOf(command: string, sent: string, { names, held }: CheckPlan): string[] {
	const what = `${kebabOf(command)} saves through the ${names.key} gateway and answers what it saved`;
	return [
		`const sent = await started.send(${sent}, { name: "second" });`,
		`check("${what}", [sent.ok ? sent.output : sent.reason, ${held}.${names.key}()], [`,
		"\t{",
		'\t\tnames: ["first", "second"],',
		"\t},",
		"\t{",
		'\t\tnames: ["first", "second"],',
		"\t},",
		"]);",
	];
}
