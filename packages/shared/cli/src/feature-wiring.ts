import type { CallExpression, FunctionDeclaration, Node, TSTypeAliasDeclaration } from "@babel/types";
import type { PlannedFile } from "./add-plan.js";
import { CliRefusal } from "./cli-output.js";
import type { FeatureNames } from "./feature-files.js";
import { memoryPartsOf, partsTypeOf, type ModulePlacement } from "./module-files.js";
import { jsSpecifierOf } from "./scaffold-names.js";
import {
	afterImports,
	endOf,
	nodesIn,
	parsedFile,
	withEdits,
	type ParsedFile,
	type SourceEdit,
} from "./source-edits.js";

export interface PickerSource extends PlannedFile {
	readonly module: string;
}

interface PickerWiring extends PickerSource {
	readonly file: ParsedFile;
	readonly names: FeatureNames;
}

interface Appended {
	readonly container: Node;
	readonly children: readonly Node[];
	readonly alone: string;
	readonly after: string;
}

const GATEWAYS = "gateways/";
const PLACEMENTS: readonly ModulePlacement[] = ["Server", "Device", "Anywhere"];
const NO_PLACEMENT = "{file} has no .on(Server | Device | Anywhere): add feature reads where the module runs";
const NO_PUBLIC = "{file} has no .public(...) call: add it before .provide, then run add feature again";
const NO_PARTS_TYPE =
	"{picker} has no `export type {parts} = { ... }`: add `readonly {key}: {gateway};` to the module's parts by hand";
const NO_MEMORY_PARTS =
	"{picker} has no `{memory}()` returning an object: add `{key}: new {memoryGateway}(...)` to the module's parts by hand";

export function placementIn({ at, text }: PlannedFile): ModulePlacement {
	const placement = callsNamed(parsedFile(text).program, "on")
		.flatMap(({ arguments: [placed] }) => (placed?.type === "Identifier" ? [placed.name] : []))
		.find((name): name is ModulePlacement => PLACEMENTS.some((known) => known === name));

	if (placement === undefined) {
		throw new CliRefusal(NO_PLACEMENT.replace("{file}", () => at));
	}

	return placement;
}

export function moduleWired({ at, text }: PlannedFile, requests: readonly string[], from: string): string {
	const file = parsedFile(text);
	const [listing] = callsNamed(file.program, "public");

	if (listing === undefined) {
		throw new CliRefusal(NO_PUBLIC.replace("{file}", () => at));
	}

	return withEdits(text, [
		importEdit(file, [`import { ${[...requests].sort().join(", ")} } from "${from}";`]),
		appendedEdit({
			container: listing,
			children: listing.arguments,
			alone: requests.join(", "),
			after: `, ${requests.join(", ")}`,
		}),
	]);
}

export function pickerWired(picker: PickerSource, names: FeatureNames): string {
	const wiring = {
		...picker,
		file: parsedFile(picker.text),
		names,
	};
	return withEdits(picker.text, [
		importEdit(wiring.file, [
			`import type { ${names.gateway} } from "${besideParts(names.gatewayFile)}";`,
			`import { ${names.memoryGateway} } from "${besideParts(names.memoryFile)}";`,
		]),
		partsTypeEdit(wiring),
		memoryPartsEdit(wiring),
	]);
}

function refusalOf(template: string, { module, at, names }: PickerWiring): CliRefusal {
	return new CliRefusal(
		template
			.replace("{picker}", () => at)
			.replace("{parts}", () => partsTypeOf(module))
			.replace("{memory}", () => memoryPartsOf(module))
			.replace("{key}", () => names.key)
			.replace("{gateway}", () => names.gateway)
			.replace("{memoryGateway}", () => names.memoryGateway),
	);
}

function partsTypeEdit(wiring: PickerWiring): SourceEdit {
	const { file, module, names } = wiring;
	const literal = nodesIn(
		file.program,
		(node): node is TSTypeAliasDeclaration => node.type === "TSTypeAliasDeclaration",
	).find(({ id }) => id.name === partsTypeOf(module))?.typeAnnotation;

	if (literal?.type !== "TSTypeLiteral") {
		throw refusalOf(NO_PARTS_TYPE, wiring);
	}

	const member = `readonly ${names.key}: ${names.gateway};`;
	return appendedEdit({
		container: literal,
		children: literal.members,
		alone: `\n${member}\n`,
		after: `\n${member}`,
	});
}

function memoryPartsEdit(wiring: PickerWiring): SourceEdit {
	const { file, module, names } = wiring;
	const returned = nodesIn(file.program, (node): node is FunctionDeclaration => node.type === "FunctionDeclaration")
		.find(({ id }) => id?.name === memoryPartsOf(module))
		?.body.body.find((statement) => statement.type === "ReturnStatement")?.argument;

	if (returned?.type !== "ObjectExpression") {
		throw refusalOf(NO_MEMORY_PARTS, wiring);
	}

	const seeded = `${names.key}: new ${names.memoryGateway}({\n\tnames: [],\n})`;
	return appendedEdit({
		container: returned,
		children: returned.properties,
		alone: `\n${seeded},\n`,
		after: `,\n${seeded}`,
	});
}

function appendedEdit({ container, children, alone, after }: Appended): SourceEdit {
	const last = children.at(-1);

	if (last === undefined) {
		const beforeClosing = endOf(container) - 1;
		return { start: beforeClosing, end: beforeClosing, text: alone };
	}

	return { start: endOf(last), end: endOf(last), text: after };
}

function importEdit(file: ParsedFile, lines: readonly string[]): SourceEdit {
	const at = afterImports(file);
	const text = lines.join("\n");
	return { start: at, end: at, text: at === 0 ? `${text}\n` : `\n${text}` };
}

function callsNamed(program: Node, method: string): CallExpression[] {
	return nodesIn(
		program,
		(node): node is CallExpression =>
			node.type === "CallExpression" &&
			node.callee.type === "MemberExpression" &&
			node.callee.property.type === "Identifier" &&
			node.callee.property.name === method,
	);
}

function besideParts(gatewayFile: string): string {
	return `../${jsSpecifierOf(gatewayFile.slice(GATEWAYS.length))}`;
}
