import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { isSafeAppName } from "@widgetarium/core/app-design.js";
import {
	lookPathOf,
	lookToWrite,
	offeredSettingOf,
	readLook,
	readSystemSettings,
	withSettingsOffered,
} from "@widgetarium/core/app-look.js";
import type { Look, OfferedSetting } from "@widgetarium/core/app-look.js";
import type { Parsed } from "@widgetarium/core/json-text.js";
import { systemSettingsPathOf } from "@widgetarium/core/paths.js";
import type { Told } from "./shape-command.js";

const NO_APP = 'Name the app, for example: look "Reading list" --system minimal';
const NO_LOOK = "{app} has no look yet: offer it with `look {app} --system <id>` from the system's settings.json.";
const NO_SYSTEM = "No design system named {system}: its settings.json is not at {path}.";
const NOT_A_WORD = "--{flag} needs a word after it, for example --{flag} minimal.";
const OPTIONS_HINT =
	'For example: look "Reading list" --setting cover --options photo,none --recommend photo --ask "Cover"';
const UNREADABLE = "look.json of {app} cannot be read: {why}";
const SETTINGS_UNREADABLE = "{path} cannot be offered: {why}";
const OFFERED =
	"{app} offers {count} settings on its canvas; the person picks there. Read the picks with `look {app}`.";
const PICK_LINE = "{name}: {picked} (options {options}; suggested {recommended})";
const PICKS_HEAD = "{app} looks like {system}:";
const WORD_FLAGS = ["system", "setting", "drop", "options", "recommend", "ask"] as const;

type CommandFlags = Readonly<Record<string, unknown>>;

type LookFlags = Partial<Record<(typeof WORD_FLAGS)[number], string>>;

export async function runLookCommand(vault: string, app: string | undefined, flags: CommandFlags): Promise<Told<Look>> {
	if (!app || !isSafeAppName(app)) return { refusal: NO_APP };
	const asked = lookFlagsOf(flags);
	if (asked.refusal !== undefined) return asked;
	const path = join(vault, lookPathOf(app));
	const was = await readLookFile(path, app);
	if (was.refusal !== undefined) return was;
	const next = await lookToApply(vault, app, was.value, asked.value);
	if (next.refusal !== undefined) return next;
	if (next.value === was.value) return describeLook(app, next.value);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, lookToWrite(next.value));
	return {
		value: next.value,
		text: OFFERED.replaceAll("{app}", app).replace("{count}", String(next.value.settings.length)),
	};
}

function lookFlagsOf(flags: CommandFlags): Parsed<LookFlags> {
	const words: Record<string, string> = {};
	for (const flag of WORD_FLAGS) {
		const value = flags[flag];
		if (value === undefined) continue;
		if (typeof value !== "string" || value.trim() === "") return { refusal: NOT_A_WORD.replaceAll("{flag}", flag) };
		words[flag] = value.trim();
	}
	return { value: words };
}

async function lookToApply(vault: string, app: string, was: Look | null, flags: LookFlags): Promise<Parsed<Look>> {
	if (flags.system) {
		const offered = await readSettingsOf(vault, flags.system);
		if (offered.refusal !== undefined) return offered;
		return { value: withSettingsOffered(was, flags.system, offered.value) };
	}
	if (!was) return { refusal: NO_LOOK.replaceAll("{app}", app) };
	if (flags.drop) return { value: { ...was, settings: was.settings.filter((held) => held.name !== flags.drop) } };
	if (!flags.setting) return { value: was };
	const asked = offeredSettingOf({
		name: flags.setting,
		options: (flags.options ?? "")
			.split(",")
			.map((word) => word.trim())
			.filter(Boolean),
		recommended: flags.recommend,
		...(flags.ask ? { ask: flags.ask } : {}),
	});
	if (asked.refusal !== undefined) return { refusal: `${asked.refusal}. ${OPTIONS_HINT}` };
	const isHeld = was.settings.some((held) => held.name === asked.value.name);
	const settings = isHeld
		? was.settings.map((held) => (held.name === asked.value.name ? asked.value : held))
		: [...was.settings, asked.value];
	return { value: withSettingsOffered(was, was.system, settings) };
}

async function readSettingsOf(vault: string, system: string): Promise<Parsed<OfferedSetting[]>> {
	const path = join(vault, systemSettingsPathOf(system));
	const text = await readFile(path, "utf8").catch(() => null);
	if (text === null) return { refusal: NO_SYSTEM.replace("{system}", system).replace("{path}", path) };
	const read = readSystemSettings(text);
	if (read.refusal !== undefined)
		return { refusal: SETTINGS_UNREADABLE.replace("{path}", path).replace("{why}", read.refusal) };
	return read;
}

async function readLookFile(path: string, app: string): Promise<Parsed<Look | null>> {
	const text = await readFile(path, "utf8").catch(() => null);
	if (text === null) return { value: null };
	const read = readLook(text);
	if (read.refusal !== undefined) return { refusal: UNREADABLE.replace("{app}", app).replace("{why}", read.refusal) };
	return read;
}

function describeLook(app: string, look: Look | null): Told<Look> {
	if (!look) return { refusal: NO_LOOK.replaceAll("{app}", app) };
	const lines = look.settings.map((setting) =>
		PICK_LINE.replace("{name}", setting.name)
			.replace("{picked}", setting.picked)
			.replace("{options}", setting.options.join(", "))
			.replace("{recommended}", setting.recommended),
	);
	return {
		value: look,
		text: [PICKS_HEAD.replace("{app}", app).replace("{system}", look.system), ...lines].join("\n"),
	};
}
