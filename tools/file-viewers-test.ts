import { JSDOM } from "jsdom";
import { CHAT_LOOK, FILE_LOOK, markdownNodesOf } from "@widgetarium/markdown";
import type { FileViewer } from "../plugins/files/src/slots.ts";
import { extensionOf, viewerOfFile } from "../plugins/files/src/features/file-app/lib/viewer-of-file.ts";
import { secretsHidden, shownCodeOf } from "../plugins/code-viewer/src/features/code/lib/shown-code.ts";
import { check, tally } from "./check-helpers.ts";

const NO_VIEW = (): null => null;

function viewerOf(id: string, extensions: readonly string[]): FileViewer {
	return {
		id,
		title: id,
		icon: "<svg></svg>",
		extensions: [...extensions],
		view: NO_VIEW,
	};
}

const VIEWERS = [viewerOf("code-viewer", ["*", "json"]), viewerOf("markdown-viewer", ["md"])];
const LONG_BASH = ["```bash", ...Array.from({ length: 60 }, (_, at) => `echo ${at}`), "```"].join("\n");

function chosenIdOf(path: string, choices: Readonly<Record<string, string>>): string | null {
	return viewerOfFile(path, VIEWERS, choices).viewer?.id ?? null;
}

function codeToolsOf(markdown: string, look: typeof CHAT_LOOK): readonly string[] {
	const page = new JSDOM("<div></div>").window.document;
	const holder = page.createElement("div");
	holder.append(...markdownNodesOf(page, markdown, look));
	return [...holder.querySelectorAll("button")].map(
		(tool) => tool.getAttribute("aria-label") ?? tool.textContent ?? "",
	);
}

check("a declared extension opens in the viewer that declares it", chosenIdOf("/notes/plan.md", {}), "markdown-viewer");
check(
	"an extension no viewer declares falls back to the viewer of any file",
	chosenIdOf("/src/app.rs", {}),
	"code-viewer",
);
check(
	"file-viewers.json wins over a declared extension",
	chosenIdOf("/notes/plan.md", { md: "code-viewer" }),
	"code-viewer",
);
check(
	"a choice naming no installed viewer is passed over",
	chosenIdOf("/notes/plan.md", { md: "gone" }),
	"markdown-viewer",
);
check(
	"with no viewer of any file, an unknown type has no viewer",
	viewerOfFile("/a.rs", [viewerOf("markdown-viewer", ["md"])], {}).viewer,
	null,
);
check(
	"an extension is lowercase without its dot; .env files and dotfiles are told apart",
	["/a/B.MD", "/a/.env", "/a/.env.local", "/a/.gitignore", "/a/Makefile"].map(extensionOf),
	["md", "env", "env", "", ""],
);
check(
	"an .env file shows its keys and comments, never its values",
	secretsHidden("# keys\nAPI_KEY=sk-123\nexport TOKEN = abc\nEMPTY=\n"),
	"# keys\nAPI_KEY=••••••••\nexport TOKEN = ••••••••\nEMPTY=\n",
);
check("an .env.local file is read as dotenv with its values hidden", shownCodeOf("/p/.env.local", "A=1"), {
	language: "dotenv",
	body: "A=••••••••",
});
check("any other file keeps its text and takes its extension as the language", shownCodeOf("/p/x.JSON", "{}"), {
	language: "json",
	body: "{}",
});
check(
	"a bash block in the chat offers to run it and folds past 50 lines",
	codeToolsOf(LONG_BASH, CHAT_LOOK).length > codeToolsOf(LONG_BASH, FILE_LOOK).length,
	true,
);
check(
	"a bash block in a file offers neither running nor folding",
	codeToolsOf(LONG_BASH, FILE_LOOK).some((said) => /run|more lines/i.test(said)),
	false,
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("file viewers: all checks passed");
