import path from "node:path";
import { CliRefusal } from "./cli-output.js";
import type { Imported } from "./contract-imports.js";
import { declaredNameOf, declaredOf, isExportedType, schemaFileOf } from "./schema-declarations.js";
import type { Declared, SchemaFile } from "./schema-declarations.js";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";

export interface SchemaRoot {
	readonly name: string;
	readonly file: string;
}

export interface CopiedSchemas {
	readonly text: string;
	readonly imports: readonly Imported[];
	readonly exportedNames: ReadonlySet<string>;
}

export interface SchemasElsewhere {
	readonly specifier: string;
	readonly names: ReadonlySet<string>;
}

type Resolved =
	| { readonly kind: "declared"; readonly declared: Declared }
	| { readonly kind: "zod"; readonly imported: Imported }
	| { readonly kind: "known" }
	| { readonly kind: "foreign"; readonly specifier: string }
	| { readonly kind: "missing" };

const ZOD = "zod";
const SCHEMAS = "shared/schema/";
const SCRIPT = /\.[jt]s$/;
const KNOWN_NAMES: ReadonlySet<string> = new Set(["undefined", "Readonly", "ReadonlyArray", "Record", "Partial"]);
const NOWHERE_ELSE: SchemasElsewhere = {
	specifier: "",
	names: new Set(),
};

const FOREIGN =
	"{file}: {name} comes from {specifier}; a schema copied into the contract reads only zod and shared/schema";
const MISSING = "{file}: the contract needs {name}, which that file neither imports nor declares";
const ALIASED = "{file}: {name} is imported under another name; import a schema under its own name";
const TWO_DECLARED = "{name} is declared in {one} and in {other}; two schemas copied into one contract need two names";

export function copiedSchemasOf(
	folder: string,
	roots: readonly SchemaRoot[],
	elsewhere: SchemasElsewhere = NOWHERE_ELSE,
): CopiedSchemas {
	const copying = new SchemaCopy(folder, elsewhere);
	for (const root of roots) {
		copying.add(root.file, root.name);
	}

	copying.addExportedTypes();
	return copying.copied();
}

class SchemaCopy {
	private readonly files = new Map<string, SchemaFile>();
	private readonly collected = new Map<string, Declared>();
	private readonly zodImports = new Map<string, Imported>();
	private readonly elsewhereImports = new Map<string, Imported>();

	constructor(
		private readonly folder: string,
		private readonly elsewhere: SchemasElsewhere,
	) {}

	add(file: string, name: string): void {
		const resolved = this.resolve(file, name);

		if (resolved.kind === "foreign" || resolved.kind === "missing") {
			throw new CliRefusal(refusalOf(resolved, file, name));
		}

		if (resolved.kind === "zod") {
			this.zodImports.set(resolved.imported.local, resolved.imported);
			return;
		}

		if (resolved.kind === "declared") {
			this.collect(resolved.declared);
		}
	}

	addExportedTypes(): void {
		let isGrowing = true;

		while (isGrowing) {
			const ready = [...this.files.values()].flatMap((file) => this.readyTypesIn(file));
			ready.forEach((declared) => this.collect(declared));
			isGrowing = ready.length > 0;
		}
	}

	copied(): CopiedSchemas {
		const emitted: Declared[] = [];
		const ordered = [...this.collected.values()].sort(
			(one, other) => one.file.localeCompare(other.file) || one.at - other.at,
		);
		ordered.forEach((declared) => this.emitAfterEager(declared, emitted));
		return {
			text: emitted.map(({ text }) => `${text}\n`).join("\n"),
			imports: [...this.zodImports.values(), ...this.elsewhereImports.values()],
			exportedNames: new Set(emitted.filter(({ isExported }) => isExported).map(({ name }) => name)),
		};
	}

	private collect(declared: Declared): void {
		if (this.elsewhere.names.has(declared.name)) {
			this.elsewhereImports.set(declared.name, this.importedFromElsewhere(declared));
			return;
		}

		const held = this.collected.get(declared.name);

		if (held !== undefined) {
			refuseTwoDeclared(held, declared);
			return;
		}

		this.collected.set(declared.name, declared);
		for (const name of [...declared.eager, ...declared.needs]) {
			this.add(declared.file, name);
		}
	}

	private readyTypesIn(file: SchemaFile): Declared[] {
		return file.body.filter(isExportedType).flatMap((statement) => {
			const declared = declaredOf(file, statement);
			const isReady =
				declared !== null &&
				!this.collected.has(declared.name) &&
				!this.elsewhere.names.has(declared.name) &&
				declared.needs.every((name) => this.isCopiedName(file.relative, name));
			return isReady ? [declared] : [];
		});
	}

	private isCopiedName(file: string, name: string): boolean {
		const resolved = this.resolve(file, name);
		if (resolved.kind === "declared") {
			return this.collected.has(resolved.declared.name) || this.elsewhere.names.has(resolved.declared.name);
		}

		return resolved.kind === "zod" || resolved.kind === "known";
	}

	private importedFromElsewhere({ name, isExportedType }: Declared): Imported {
		return {
			specifier: this.elsewhere.specifier,
			imported: name,
			local: name,
			form: "named",
			isType: isExportedType,
		};
	}

	private emitAfterEager(declared: Declared, emitted: Declared[]): void {
		if (emitted.some(({ name }) => name === declared.name) || this.elsewhere.names.has(declared.name)) {
			return;
		}

		for (const name of declared.eager) {
			declaredIn(this.resolve(declared.file, name)).forEach((one) => this.emitAfterEager(one, emitted));
		}

		emitted.push(declared);
	}

	private resolve(relative: string, name: string): Resolved {
		const file = this.fileOf(relative);
		const statement = file.body.find((one) => declaredNameOf(one) === name);
		const declared = statement === undefined ? null : declaredOf(file, statement);

		if (declared !== null) {
			return { kind: "declared", declared };
		}

		const imported = file.imports.find(({ local }) => local === name);

		if (imported === undefined) {
			return KNOWN_NAMES.has(name) ? { kind: "known" } : { kind: "missing" };
		}

		return this.resolveImport(file, imported);
	}

	private resolveImport(file: SchemaFile, imported: Imported): Resolved {
		if (imported.specifier === ZOD) {
			return { kind: "zod", imported };
		}

		const target = relativeOf(file.relative, imported.specifier);

		if (!imported.specifier.startsWith(".") || !target.startsWith(SCHEMAS)) {
			return { kind: "foreign", specifier: imported.specifier };
		}

		if (imported.form !== "named" || imported.imported !== imported.local) {
			throw new CliRefusal(fillTemplate(ALIASED, { file: file.relative, name: imported.local }));
		}

		return this.resolve(target, imported.imported);
	}

	private fileOf(relative: string): SchemaFile {
		const held = this.files.get(relative);

		if (held !== undefined) {
			return held;
		}

		const file = schemaFileOf(this.folder, relative);
		this.files.set(relative, file);
		return file;
	}
}

function declaredIn(resolved: Resolved): Declared[] {
	return resolved.kind === "declared" ? [resolved.declared] : [];
}

function refusalOf(resolved: Resolved, file: string, name: string): string {
	if (resolved.kind === "foreign") {
		return fillTemplate(FOREIGN, { file, name, specifier: resolved.specifier });
	}

	return fillTemplate(MISSING, { file, name });
}

function refuseTwoDeclared(held: Declared, declared: Declared): void {
	if (held.file === declared.file && held.at === declared.at) {
		return;
	}

	throw new CliRefusal(fillTemplate(TWO_DECLARED, { name: declared.name, one: held.file, other: declared.file }));
}

function relativeOf(fromRelative: string, specifier: string): string {
	return path.posix.normalize(path.posix.join(path.posix.dirname(fromRelative), specifier)).replace(SCRIPT, ".ts");
}
