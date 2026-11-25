import { fileSystem, terminal } from "@sumi/contract";
import type { Runtime } from "@widgetarium/data-framework";
import { BUILD_SKILL_TEXT } from "../../../shared/lib/build-skill.js";

const SKILL_FOLDER = "{home}/.claude/skills/build-sumi-plugin";
const NO_HOME = "the home folder could not be found: {reason}";

export async function installSkill(windowApp: Runtime): Promise<string | null> {
	const printed = await windowApp.send(terminal.programs.run, { folder: "/", program: "printenv", args: ["HOME"] });

	if (!printed.ok) {
		return printed.reason;
	}

	const home = printed.output.out.trim();

	if (printed.output.code !== 0 || !home.startsWith("/")) {
		return NO_HOME.replace("{reason}", printed.output.err.trim() || "HOME is empty");
	}

	const folder = SKILL_FOLDER.replace("{home}", home);
	const made = await windowApp.send(fileSystem.files.makeFolder, { path: folder });

	if (!made.ok) {
		return made.reason;
	}

	const written = await windowApp.send(fileSystem.files.write, {
		path: `${folder}/SKILL.md`,
		content: BUILD_SKILL_TEXT,
	});
	return written.ok ? null : written.reason;
}
