import fs from "node:fs";
import path from "node:path";
import { compile } from "tailwindcss";

export const TAILWIND_BANNER = "/*! tailwindcss";

const SOURCES = [
	"apps/studio/src/features/canvas",
	"apps/studio/src/features/mascot",
	"apps/studio/src/features/app-host",
	"packages/domain/browser",
	"apps/studio/src/features/assistant",
	"apps/studio/src/canvas",
	"apps/studio/src/browser",
	"plugins/ai/chat/src",
	"plugins/ai/questions/src",
	"plugins/ai/composer-expand/src",
	"plugins/ai/slash-commands/src",
	"plugins/ai/claude-code/src",
	"plugins/ai/working-folder/src",
	"plugins/ai/permission-mode/src",
	"plugins/ai/plan-usage/src",
	"plugins/ai/model-picker/src",
	"plugins/ai/effort-picker/src",
	"plugins/control-menu/src",
	"plugins/tabs/tab-strip/src",
	"plugins/tabs/pinned-tabs/src",
];
const INSTALLED = "node_modules/";
const SCANNED = /\.(ts|tsx)$/;
const CANDIDATE = /[^\s"'`]+/g;
const NAMED_SHEETS: Readonly<Record<string, string>> = {
	"tailwindcss/theme.css": "node_modules/tailwindcss/theme.css",
	"tailwindcss/utilities.css": "node_modules/tailwindcss/utilities.css",
	"@widgetarium/kit/theme.css": "packages/shared/kit/theme.css",
	"@widgetarium/studio/canvas.css": "apps/studio/src/features/canvas/canvas.css",
	"@widgetarium/studio/mascot.css": "apps/studio/src/features/mascot/mascot.css",
	"@widgetarium/studio/workspaces.css": "apps/studio/src/features/workspaces/workspaces.css",
	"@widgetarium/studio/shell.css": "apps/studio/src/features/frame/shell.css",
	"@widgetarium/studio/command-menu.css":
		"plugins/command-menu/src/features/command-menu/ui/command-menu/command-menu.css",
	"@sumi/command-menu-plugin/home-page.css": "plugins/command-menu/src/features/command-menu/ui/home-page/home-page.css",
	"@sumi/chat-plugin/assistant.css": "plugins/ai/chat/src/features/assistant/ui/assistant-panel/assistant.css",
	"@sumi/chat-plugin/assistant-utilities.css":
		"plugins/ai/chat/src/features/assistant/ui/assistant-panel/assistant-utilities.css",
	"@sumi/chat-plugin/queue.css": "plugins/ai/chat/src/features/assistant/ui/queue/queue.css",
	"@sumi/questions-plugin/questions.css":
		"plugins/ai/questions/src/features/questions/ui/questions-block/questions.css",
	"@sumi/chat-plugin/chat-page.css": "plugins/ai/chat/src/features/chat-page/ui/chat-page/chat-page.css",
	"@sumi/composer-expand-plugin/expand-frame.css":
		"plugins/ai/composer-expand/src/features/composer-expand/ui/expand-frame/expand-frame.css",
	"@sumi/composer-expand-plugin/expand-toggle.css":
		"plugins/ai/composer-expand/src/features/composer-expand/ui/expand-toggle/expand-toggle.css",
	"@sumi/slash-commands-plugin/slash-commands.css":
		"plugins/ai/slash-commands/src/features/slash-menu/ui/slash-commands/slash-commands.css",
	"@sumi/plan-usage-plugin/usage-button.css":
		"plugins/ai/plan-usage/src/features/plan-usage/ui/usage-button/usage-button.css",
	"@sumi/sumi-host-plugin/sumi-figure.css": "plugins/sumi-host/src/features/mascot/ui/sumi-figure/sumi-figure.css",
	"@sumi/control-menu-plugin/control-menu.css":
		"plugins/control-menu/src/features/control-menu/ui/control-menu/control-menu.css",
	"@sumi/tab-strip-plugin/tab-strip.css": "plugins/tabs/tab-strip/src/features/tab-strip/ui/tab-strip/tab-strip.css",
	"@sumi/pinned-tabs-plugin/pinned-tabs.css":
		"plugins/tabs/pinned-tabs/src/features/pinned-tabs/ui/pinned-tabs/pinned-tabs.css",
	"@sumi/sumi-host-plugin/title-bar.css": "plugins/sumi-host/src/features/title-bar/ui/title-bar/title-bar.css",
	"@sumi/chat-plugin/new-chat-row.css": "plugins/ai/chat/src/features/new-chat/ui/new-chat-row/new-chat-row.css",
	"@sumi/terminal-cursor-plugin/terminal-cursor.css":
		"plugins/terminal-cursor/src/features/terminal-cursor/ui/terminal-cursor-layer/terminal-cursor.css",
	"@sumi/keyboard-language-plugin/keyboard-language-tag.css":
		"plugins/ai/keyboard-language/src/features/keyboard-language/ui/keyboard-language-tag/keyboard-language-tag.css",
	"@widgetarium/kit/side-panel.css": "packages/shared/kit/side-panel.css",
	"@sumi/canvas-plugin/canvas-page.css": "plugins/canvas/src/features/canvas/ui/canvas-page/canvas-page.css",
	"@sumi/model-picker-plugin/model-menu.css":
		"plugins/ai/model-picker/src/features/model-picker/ui/model-button/model-menu.css",
};
// TRADE-OFF: a prefix on every class, because utilities are !important and Obsidian, its themes and other plugins share one page
const ENTRY = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme) prefix(cv);
@import "tailwindcss/utilities.css" layer(utilities) important;
@import "@widgetarium/kit/theme.css";
@import "@widgetarium/studio/canvas.css";
@import "@widgetarium/studio/mascot.css";
@import "@widgetarium/studio/workspaces.css";
@import "@widgetarium/studio/shell.css";
@import "@widgetarium/studio/command-menu.css";
@import "@sumi/command-menu-plugin/home-page.css";
@import "@sumi/chat-plugin/assistant.css";
@import "@sumi/chat-plugin/assistant-utilities.css";
@import "@sumi/chat-plugin/queue.css";
@import "@sumi/questions-plugin/questions.css";
@import "@sumi/chat-plugin/chat-page.css";
@import "@sumi/composer-expand-plugin/expand-frame.css";
@import "@sumi/composer-expand-plugin/expand-toggle.css";
@import "@sumi/slash-commands-plugin/slash-commands.css";
@import "@sumi/model-picker-plugin/model-menu.css";
@import "@sumi/plan-usage-plugin/usage-button.css";
@import "@sumi/chat-plugin/new-chat-row.css";
@import "@sumi/sumi-host-plugin/sumi-figure.css";
@import "@sumi/sumi-host-plugin/title-bar.css";
@import "@sumi/control-menu-plugin/control-menu.css";
@import "@sumi/tab-strip-plugin/tab-strip.css";
@import "@sumi/pinned-tabs-plugin/pinned-tabs.css";
@import "@sumi/terminal-cursor-plugin/terminal-cursor.css";
@import "@widgetarium/kit/side-panel.css";
@import "@sumi/canvas-plugin/canvas-page.css";
@import "@sumi/keyboard-language-plugin/keyboard-language-tag.css";
`;

export function canvasSheetSources(repo: string): string[] {
	return Object.values(NAMED_SHEETS)
		.filter((sheet) => !sheet.startsWith(INSTALLED))
		.map((sheet) => path.join(repo, sheet));
}

export async function canvasSheet(repo: string): Promise<string> {
	const compiler = await compile(ENTRY, {
		base: repo,
		loadStylesheet: async (id: string, base: string) => {
			const named = NAMED_SHEETS[id];
			if (!named) throw new Error(`the canvas sheet imports ${id}, which it does not know`);
			const at = path.join(repo, named);
			return { path: at, base, content: fs.readFileSync(at, "utf8") };
		},
	});
	return compiler.build(candidatesUnder(repo));
}

export function withCanvasSheet(authored: string, sheet: string): string {
	const [kept = ""] = authored.split(TAILWIND_BANNER);
	return `${kept.trimEnd()}\n\n${sheet.trimEnd()}\n`;
}

function candidatesUnder(repo: string): string[] {
	const files = SOURCES.flatMap((source) => filesUnder(path.join(repo, source)));
	return [...new Set(files.flatMap((file) => fs.readFileSync(file, "utf8").match(CANDIDATE) ?? []))];
}

function filesUnder(folder: string): string[] {
	return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
		const at = path.join(folder, entry.name);
		if (entry.isDirectory()) return entry.name === "node_modules" ? [] : filesUnder(at);
		return SCANNED.test(entry.name) ? [at] : [];
	});
}
