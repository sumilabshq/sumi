import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { orpcTransport, runtime } from "@widgetarium/data-framework";
import { dataFrameworkMiddleware } from "@widgetarium/data-framework/server";
import { terminal } from "@sumi/contract";
import type { ProgramOutput, RunProgramInput } from "@sumi/contract";
import { chatContext as chatContextContract } from "../plugins/ai/chat-context/data/chat-context/generated/contract.ts";
import { chatContext as chatContextModule } from "../plugins/ai/chat-context/data/chat-context/generated/module.ts";
import { LocalStorageEditorChoiceGateway } from "../plugins/ai/chat-context/data/chat-context/gateways/editor-choice/local-storage.gateway.ts";
import { MemoryEditorChoiceGateway } from "../plugins/ai/chat-context/data/chat-context/gateways/editor-choice/memory.gateway.ts";
import { homeShortened } from "../plugins/ai/chat-context/src/features/chat-context/lib/home-shortened.ts";
import { chipOf } from "../plugins/ai/chat-context/src/features/chat-context/lib/chip-of.ts";
import { MemoryProcessesGateway } from "../apps/tauri/capabilities/terminal/gateways/processes/memory.gateway.ts";
import { NodeProgramsGateway } from "../apps/tauri/capabilities/terminal/gateways/programs/node.gateway.ts";
import { ProgramsGateway } from "../apps/tauri/capabilities/terminal/gateways/programs/programs.gateway.ts";
import { MemoryTerminalSessionsGateway } from "../apps/tauri/capabilities/terminal/gateways/terminal-sessions/memory.gateway.ts";
import { terminal as terminalModule } from "../apps/tauri/capabilities/terminal/generated/module.ts";
import { AppCallerAuthenticate, APP_CALLER_HEADER } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally } from "./check-helpers.ts";

class ThisMacPrograms extends ProgramsGateway {
	readonly opened: RunProgramInput[] = [];
	private readonly real = new NodeProgramsGateway();

	override async runProgram(input: RunProgramInput): Promise<ProgramOutput> {
		if (input.program === "ls") {
			return { out: "Cursor.app\nSafari.app\nZed.app\n", err: "", code: 0 };
		}

		if (input.program === "open") {
			this.opened.push(input);
			return { out: "", err: "", code: 0 };
		}

		return this.real.runProgram(input);
	}
}

const parent = realpathSync(mkdtempSync(path.join(tmpdir(), "sumi-chat-context-")));
const repo = path.join(parent, "app");
const notes = path.join(parent, "notes");
mkdirSync(repo);
mkdirSync(notes);
execFileSync("git", ["init", "-q", "-b", "main"], { cwd: repo });
writeFileSync(path.join(repo, "a.txt"), "one\n");
execFileSync("git", ["add", "a.txt"], { cwd: repo });
execFileSync("git", ["-c", "user.name=Checks", "-c", "user.email=c@sumi.test", "commit", "-q", "-m", "First"], {
	cwd: repo,
});

const programs = new ThisMacPrograms();
const core = runtime()
	.modules(
		terminalModule({
			injects: {
				sessions: new MemoryTerminalSessionsGateway(),
				programs,
				processes: new MemoryProcessesGateway(),
			},
		}),
	)
	.start({ platform: "server", env: {} });
const served = dataFrameworkMiddleware(core, { authenticate: new AppCallerAuthenticate() });
const toCore = orpcTransport("http://checks.test", {
	fetch: served.fetch,
	headers: () => ({ [APP_CALLER_HEADER]: "chat-context" }),
});
const app = runtime()
	.modules(chatContextModule({ injects: { editorChoice: new MemoryEditorChoiceGateway() } }))
	.imports(terminal({ over: toCore }))
	.start({ platform: "browser", scope: { workspaceId: "chat-context-checks" } });

const inRepo = await app.send(chatContextContract.context.read, { folder: repo });
check(
	"a folder in a git repo reads its branch, name and the editors found, Finder last",
	inRepo.ok ? [inRepo.output.branch, inRepo.output.name, inRepo.output.editors] : inRepo,
	["main", "app", ["Zed", "Cursor", "Finder"]],
);
check("the default editor is the first found", inRepo.ok ? inRepo.output.editor : inRepo, "Zed");

const plain = await app.send(chatContextContract.context.read, { folder: notes });
check(
	"a folder with no repo has no branch, only its name",
	plain.ok ? [plain.output.branch, plain.output.name] : plain,
	[null, "notes"],
);

const opened = await app.send(chatContextContract.context.openIn, { folder: repo, editor: "Cursor" });
check(
	"opening in an editor runs open -a over the folder",
	[opened.ok, programs.opened.at(-1)?.args],
	[true, ["-a", "Cursor", repo]],
);

const remembered = await app.send(chatContextContract.context.read, { folder: repo });
check(
	"the last chosen editor is remembered and becomes the default",
	remembered.ok ? remembered.output.editor : remembered,
	"Cursor",
);

const refused = await app.send(chatContextContract.context.openIn, { folder: repo, editor: "rm" as never });
check("a program that is not a known editor is refused", refused.ok, false);

const revealed = await app.send(chatContextContract.context.reveal, { folder: repo });
check("a folder is revealed in Finder with open -R", [revealed.ok, programs.opened.at(-1)?.args], [true, ["-R", repo]]);

const storage = new Map<string, string>();
const stored = new LocalStorageEditorChoiceGateway({
	getItem: (key) => storage.get(key) ?? null,
	setItem: (key, value) => void storage.set(key, value),
});
stored.choose("Zed");
check(
	"the stored choice survives a new gateway over the same storage",
	new LocalStorageEditorChoiceGateway({
		getItem: (key) => storage.get(key) ?? null,
		setItem: () => undefined,
	}).chosen(),
	"Zed",
);
storage.set("sumi.chat-context.editor", "not-an-editor");
check("a stored value that is no editor reads as none", stored.chosen(), null);

const repoContext = inRepo.ok ? inRepo.output : null;
const plainContext = plain.ok ? plain.output : null;
check("the chip shows the branch in a git folder", chipOf(repoContext), { icon: "git-branch", label: "main" });
check("the chip shows the folder name without git", chipOf(plainContext), { icon: "folder", label: "notes" });
check("no folder, no chip", chipOf(null), null);
check("the home folder is written as ~ in a path", homeShortened("/Users/demo/Projects/Sumi"), "~/Projects/Sumi");
check("the home folder itself is just ~", homeShortened("/Users/demo"), "~");
check("a path outside home stays whole", homeShortened("/opt/tools"), "/opt/tools");
check("a folder named like home further down stays whole", homeShortened("/srv/Users/demo"), "/srv/Users/demo");

rmSync(parent, { recursive: true, force: true });
console.log(tally.failed ? `chat context: ${tally.failed} check(s) failed` : "chat context: all checks passed");
process.exit(tally.failed ? 1 : 0);
