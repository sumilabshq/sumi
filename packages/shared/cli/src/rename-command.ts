import path from "node:path";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import type { RenameArgs } from "./rename-args.js";
import { CliRefusal } from "./cli-output.js";
import type { CliOutput } from "./cli-output.js";
import { driftedEntriesIn } from "./generate-command.js";
import { scriptChangesOf } from "./rename-edits.js";
import type { ScriptChanges } from "./rename-edits.js";
import { resolverIn } from "./rename-files.js";
import type { ParsedScript } from "./rename-files.js";
import { renamePlan } from "./rename-plan.js";
import type { RenamePlan } from "./rename-plan.js";
import { reportMentions, reportPlan } from "./rename-report.js";
import type { RenameRun } from "./rename-report.js";
import { listRewriteOf, scriptRewriteOf } from "./rename-rewrites.js";
import type { FileRewrite } from "./rename-rewrites.js";
import { candidateScripts, sourcesReached } from "./rename-scripts.js";
import { typeCheckReported } from "./rename-type-check.js";
import { FileTransaction, reasonOf } from "./rename-writes.js";
import type { FileWrite } from "./rename-writes.js";
import { workspaceRootAbove } from "./workspace-root.js";

interface RenameScan {
	readonly scripts: readonly ParsedScript[];
	readonly changed: readonly ScriptChanges[];
}

const CLASH = "{to} is already bound where {from} is used, so the rename would change what code means: {sites}";
const UNSAFE = "rename cannot follow these uses safely, so nothing is written; rewrite them first:\n{sites}";
const UNSAFE_SITE = "  {file}:{line}  {why}";
const SUMMARY = "files changed: {files}, uses changed: {uses}";
const DRY = "dry run: nothing written";
const GENERATED = "generate: {count} file(s) written";
const WRITE_FAILED = "writing the rename failed, every file is restored: {reason}";
const GENERATE_FAILED = "generate failed after the rename, every file is restored, sources and generated: {reason}";
const NOT_RESTORED = "{failed}, and these files could not be restored; fix them by hand or with git:\n{files}";

export function runRename(args: RenameArgs, output: CliOutput, cwd: string): number {
	const root = workspaceRootAbove(cwd);
	const plan = renamePlan(args, root);
	const { scripts, changed } = scanOf(plan, root, args.isStringRewritten);
	refuseClashes(changed, plan, root);
	refuseUnsafeUses(changed, root);
	const rewrites = [...changed.map((each) => scriptRewriteOf(each, root)), ...plan.lists.map(listRewriteOf)];
	reportPlan(plan, changed, { root, output });
	reportMentions(plan, { scripts, changed, rewrites }, { root, output });

	if (args.isDry) {
		output.out(DRY);
		return 0;
	}

	writeAll(rewrites, { root, output });
	return typeCheckReported(root, args.isTypeChecked, output);
}

function scanOf(plan: RenamePlan, root: string, isStringRewritten: boolean): RenameScan {
	const resolve = resolverIn(root);
	const scripts = candidateScripts(root, plan);
	const sources = sourcesReached(scripts, { sources: plan.sources, name: plan.oldName }, resolve);
	const namespaceSources =
		plan.namespace === null
			? new Set<string>()
			: sourcesReached(scripts, { sources: plan.namespace.sources, name: plan.namespace.constant }, resolve);
	const changed = scripts
		.map((script) => scriptChangesOf(script, plan, { resolve, sources, namespaceSources, isStringRewritten }))
		.filter(
			({ changes, clashLines, stringLines, unsafeUses }) =>
				changes.length + clashLines.length + stringLines.length + unsafeUses.length > 0,
		);
	return {
		scripts,
		changed,
	};
}

function refuseClashes(changed: readonly ScriptChanges[], plan: RenamePlan, root: string): void {
	const sites = changed.flatMap(({ file, clashLines }) =>
		[...new Set(clashLines)].map((line) => `${path.relative(root, file)}:${line}`),
	);

	if (sites.length > 0) {
		throw new CliRefusal(fillTemplate(CLASH, { to: plan.newName, from: plan.oldName, sites: sites.join(", ") }));
	}
}

function refuseUnsafeUses(changed: readonly ScriptChanges[], root: string): void {
	const sites = changed.flatMap(({ file, unsafeUses }) =>
		unsafeUses.map(({ line, why }) =>
			fillTemplate(UNSAFE_SITE, { file: path.relative(root, file), line: String(line), why }),
		),
	);

	if (sites.length > 0) {
		throw new CliRefusal(fillTemplate(UNSAFE, { sites: sites.join("\n") }));
	}
}

function writeAll(rewrites: readonly FileRewrite[], { root, output }: RenameRun): void {
	const transaction = new FileTransaction(root);
	committedOrRestored(transaction, () => rewrites, WRITE_FAILED);
	const generated = committedOrRestored(transaction, () => generatedWritesIn(root), GENERATE_FAILED);
	output.out(fillTemplate(SUMMARY, { files: String(rewrites.length), uses: String(usesOf(rewrites)) }));
	output.out(fillTemplate(GENERATED, { count: String(generated) }));
}

function committedOrRestored(
	transaction: FileTransaction,
	writesOf: () => readonly FileWrite[],
	failedTemplate: string,
): number {
	try {
		const writes = writesOf();
		transaction.commit(writes);
		return writes.length;
	} catch (failure) {
		const unrestored = transaction.rollbackFailures();
		const failed = fillTemplate(failedTemplate, { reason: reasonOf(failure) });
		const said =
			unrestored.length === 0 ? failed : fillTemplate(NOT_RESTORED, { failed, files: unrestored.join("\n") });
		throw new CliRefusal(said);
	}
}

function generatedWritesIn(root: string): FileWrite[] {
	return driftedEntriesIn(root).map(({ file, text }) => ({ file, text }));
}

function usesOf(rewrites: readonly FileRewrite[]): number {
	return rewrites.reduce((sum, { uses }) => sum + uses, 0);
}
