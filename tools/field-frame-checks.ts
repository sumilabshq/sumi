import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { check, tally } from "./check-helpers.ts";

const REPO = path.resolve(import.meta.dirname, "..");
const PLUGINS = path.join(REPO, "plugins");
const SKIPPED_DIRS = new Set(["node_modules", "dist", ".git"]);
const FAKE_RING = /0 0 0 (?:var|calc)\([^;]*--space-1[^;]*var\(--field\)/;
const OLD_TRAY = /\.wg-studio-ai-tray\b/;
const KIT_FRAME_SELECTOR = /\.wg-kit-field-frame/;

function cssFilesUnder(folder: string): string[] {
	return readdirSync(folder).flatMap((name) => {
		if (SKIPPED_DIRS.has(name)) {
			return [];
		}

		const full = path.join(folder, name);

		if (statSync(full).isDirectory()) {
			return cssFilesUnder(full);
		}

		return name.endsWith(".css") ? [full] : [];
	});
}

function filesMatching(files: readonly string[], pattern: RegExp): string[] {
	return files.filter((file) => pattern.test(readFileSync(file, "utf8"))).map((file) => path.relative(REPO, file));
}

function sourceOf(relative: string): string {
	return readFileSync(path.join(REPO, relative), "utf8");
}

const pluginSheets = cssFilesUnder(PLUGINS);

check("no plugin sheet fakes a field frame with a box-shadow ring", filesMatching(pluginSheets, FAKE_RING), []);
check("no plugin sheet keeps the hand-made composer tray", filesMatching(pluginSheets, OLD_TRAY), []);
check("no plugin sheet restyles the kit field frame", filesMatching(pluginSheets, KIT_FRAME_SELECTOR), []);
check(
	"the chat composer wraps its field in FieldFrame",
	sourceOf("plugins/ai/chat/src/features/assistant/ui/composer/composer.tsx").includes("<FieldFrame"),
	true,
);
check(
	"the home search field wraps in FieldFrame",
	sourceOf("plugins/command-menu/src/features/command-menu/ui/command-menu/menu-field.tsx").includes("<FieldFrame"),
	true,
);
check(
	"the launcher home asks for the framed field",
	sourceOf("plugins/homepages/launcher-home/src/features/launcher/ui/launcher-home/launcher-home.tsx").includes(
		"isFieldFramed",
	),
	true,
);
check(
	"the slash list opens inside the frame's above slot",
	sourceOf("plugins/ai/slash-commands/src/features/slash-menu/ui/slash-commands/slash-menu-panel.tsx").includes(
		"createPortal",
	),
	true,
);

const tokens = sourceOf("design-systems/sumi/sumi.css");
check(
	"sumi.css owns the field frame tokens and the off switch",
	["--field-frame-pad:", "--field-frame-bg:", "--field-frame-line:", '[data-field-frame="off"]'].filter(
		(token) => !tokens.includes(token),
	),
	[],
);

console.log(tally.failed === 0 ? "field frame: all checks pass" : `field frame: ${tally.failed} failed`);
process.exitCode = tally.failed === 0 ? 0 : 1;
