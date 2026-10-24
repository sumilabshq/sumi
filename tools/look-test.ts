import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	lookPathOf,
	lookToWrite,
	readLook,
	readSystemSettings,
	withOptionPicked,
	withSettingsOffered,
} from "../packages/shared/core/src/app-look.ts";
import type { Look, OfferedSetting } from "../packages/shared/core/src/app-look.ts";
import { systemSettingsPathOf } from "../packages/shared/core/src/paths.ts";
import {
	fontsUrlOf,
	isSettingDrawnLive,
	liveTokensOf,
} from "../packages/domain/canvas/features/look/lib/look-tokens.ts";
import { runLookCommand } from "../apps/host-obsidian/src/legacy/ai/look-command.ts";
import type { Told } from "../apps/host-obsidian/src/legacy/ai/shape-command.ts";
import { ObsidianDesignFilesGateway } from "../packages/domain/canvas/gateways/design-files/obsidian.gateway.ts";
import { WebAgentJobsGateway } from "../packages/domain/canvas/gateways/agent-jobs/web.gateway.ts";
import { PickLookCommandHandler } from "../packages/domain/canvas/features/look/handlers.ts";
import { CachedDesignReads } from "../packages/domain/canvas/shared/lib/design/design-reads.ts";
import { MomentCanvasStore } from "../packages/domain/canvas/shared/lib/view/canvas-store.ts";
import { FARM_OPENED, FixedDesignFolderGateway } from "./canvas-hosts.ts";

let failures = 0;

async function refusesWrites(): Promise<void> {
	throw new Error("the look test writes no binary file");
}

function check(what: string, actual: unknown, expected: unknown): void {
	const isSame = JSON.stringify(actual) === JSON.stringify(expected);
	if (!isSame) failures += 1;
	const said = isSame ? "" : `\n     got ${JSON.stringify(actual)}\n     want ${JSON.stringify(expected)}`;
	console.log(`${isSame ? "OK  " : "FAIL"} ${what}${said}`);
}

function namesOf(told: Told<Look>): string[] | null {
	return told.refusal === undefined ? told.value.settings.map((setting) => setting.name) : null;
}

function lookPickedAs(look: Look, picks: Readonly<Record<string, string>>): Look {
	return {
		...look,
		settings: look.settings.map((setting) => ({ ...setting, picked: picks[setting.name] ?? setting.picked })),
	};
}

const GROUND: OfferedSetting = {
	name: "ground",
	ask: "Page background",
	options: ["white", "grey"],
	recommended: "white",
};
const SHELL: OfferedSetting = { name: "shell", options: ["sidebar", "top-bar"], recommended: "sidebar" };

const offered = withSettingsOffered(null, "minimal", [GROUND, SHELL]);
check(
	"an offered setting starts on its recommended option",
	offered.settings.map((one) => one.picked),
	["white", "sidebar"],
);

const picked = withOptionPicked(offered, "ground", "grey");
if (picked.refusal !== undefined) throw new Error(picked.refusal);
const greyLook = picked.value;
check(
	"a pick changes only its own setting",
	greyLook.settings.map((one) => one.picked),
	["grey", "sidebar"],
);
check("a pick outside the options is refused", typeof withOptionPicked(offered, "ground", "blue").refusal, "string");
check(
	"a pick of a setting the look lacks is refused",
	typeof withOptionPicked(offered, "fonts", "native").refusal,
	"string",
);

check(
	"offering again keeps the person's pick",
	withSettingsOffered(greyLook, "minimal", [GROUND]).settings[0]?.picked,
	"grey",
);
check(
	"a pick no longer offered falls back to the recommended option",
	withSettingsOffered(greyLook, "minimal", [{ ...GROUND, options: ["white", "cream"] }]).settings[0]?.picked,
	"white",
);
check(
	"picks do not travel to another system",
	withSettingsOffered(greyLook, "other", [GROUND]).settings[0]?.picked,
	"white",
);

check("look.json reads back what it wrote", readLook(lookToWrite(greyLook)).value, greyLook);
check(
	"a look whose pick is not an option is refused",
	typeof readLook(JSON.stringify({ system: "minimal", settings: [{ ...GROUND, picked: "blue" }] })).refusal,
	"string",
);
check("broken JSON is refused, not thrown", typeof readLook("{").refusal, "string");

check("white ground lays no tokens", liveTokensOf(offered), {});
check("grey ground paints the page grey and the plates white", Object.keys(liveTokensOf(greyLook)), [
	"--wg-kit-page",
	"--wg-kit-group-fill",
]);
check("the shell is drawn by the assistant, not by tokens", isSettingDrawnLive("shell"), false);

const GOOD_ENTRY = { name: "ground", options: ["white", "grey"], default: "white" };
const SHIPPED = readSystemSettings(readFileSync("design-systems/minimal/settings.json", "utf8"));
if (SHIPPED.refusal !== undefined) throw new Error(`minimal/settings.json: ${SHIPPED.refusal}`);
check("the shipped Minimal settings.json offers its settings", SHIPPED.value.length > 0, true);
const SYSTEMS_FOLDER = "design-systems";
const unreadableSettings = readdirSync(SYSTEMS_FOLDER)
	.filter((system) => existsSync(join(SYSTEMS_FOLDER, system, "settings.json")))
	.flatMap((system) => {
		const read = readSystemSettings(readFileSync(join(SYSTEMS_FOLDER, system, "settings.json"), "utf8"));
		return read.refusal === undefined ? [] : [`${system}: ${read.refusal}`];
	});
check("every system's settings.json can be offered", unreadableSettings, []);
const shippedLook = withSettingsOffered(null, "minimal", SHIPPED.value);
const silentOptions = SHIPPED.value
	.filter((setting) => isSettingDrawnLive(setting.name))
	.flatMap((setting) =>
		setting.options
			.filter((option) => option !== setting.recommended)
			.filter((option) => Object.keys(liveTokensOf(lookPickedAs(shippedLook, { [setting.name]: option }))).length === 0)
			.map((option) => `${setting.name}=${option}`),
	);
check("every live option other than the default changes a token", silentOptions, []);
check(
	"a picked font pair loads its family",
	fontsUrlOf(lookPickedAs(shippedLook, { fonts: "grotesk" }))?.includes("Instrument+Sans"),
	true,
);
check("the host font loads nothing", fontsUrlOf(lookPickedAs(shippedLook, { fonts: "native" })), null);

check(
	"settings.json with a malformed list of options is refused, not emptied",
	typeof readSystemSettings(
		JSON.stringify({ settings: [GOOD_ENTRY, { name: "edges", options: ["fill"], default: "fill" }] }),
	).refusal,
	"string",
);

const vault = await mkdtemp(join(tmpdir(), "wg-look-"));
await mkdir(join(vault, systemSettingsPathOf("minimal"), ".."), { recursive: true });
await writeFile(
	join(vault, systemSettingsPathOf("minimal")),
	JSON.stringify({
		settings: [
			{ name: "ground", ask: "Page background", options: ["white", "grey"], default: "white" },
			{ name: "shell", ask: "Navigation", options: "the agent offers the shells that fit" },
		],
	}),
);
check(
	"--system offers every setting with a list of options",
	namesOf(await runLookCommand(vault, "Reading list", { system: "minimal" })),
	["ground"],
);
check(
	"--setting adds a setting the system left to the agent",
	namesOf(
		await runLookCommand(vault, "Reading list", { setting: "shell", options: "sidebar,top-bar", recommend: "top-bar" }),
	),
	["ground", "shell"],
);
check(
	"--setting refuses a recommendation outside its options",
	typeof (await runLookCommand(vault, "Reading list", { setting: "x", options: "a,b", recommend: "c" })).refusal,
	"string",
);
check(
	"a bare --system is refused, not taken as no flag",
	typeof (await runLookCommand(vault, "Reading list", { system: true })).refusal,
	"string",
);
const written = readLook(await readFile(join(vault, lookPathOf("Reading list")), "utf8"));
check("the command writes look.json where the canvas reads it", written.value?.settings.length, 2);
check("--drop takes a setting off", namesOf(await runLookCommand(vault, "Reading list", { drop: "shell" })), [
	"ground",
]);
check(
	"an unknown system is refused",
	typeof (await runLookCommand(vault, "Reading list", { system: "nope" })).refusal,
	"string",
);
await rm(vault, { recursive: true, force: true });

const agentWroteMeanwhile = lookToWrite(lookPickedAs(offered, { shell: "top-bar" }));
const lookFile = { text: lookToWrite(offered) };
const lookAdapter = {
	exists: async () => true,
	read: async () => lookToWrite(offered),
	write: async (_path: string, text: string) => {
		lookFile.text = text;
	},
	process: async (_path: string, change: (text: string) => string) => {
		lookFile.text = change(agentWroteMeanwhile);
		return lookFile.text;
	},
};
const designFilesGateway = new ObsidianDesignFilesGateway({
	...lookAdapter,
	mkdir: refusesWrites,
	writeBinary: refusesWrites,
});
const lookReads = new CachedDesignReads(
	new FixedDesignFolderGateway(async () => ({ screens: [], references: [], widgets: [] })),
	new WebAgentJobsGateway(),
	designFilesGateway,
);
await PickLookCommandHandler.handle(
	{ settingName: "ground", option: "grey" },
	{ designFilesGateway, designReads: lookReads, canvasStore: new MomentCanvasStore(FARM_OPENED, () => undefined) },
);
const afterPick = readLook(lookFile.text);
check(
	"a look pick in Obsidian changes the file as it is at the write, keeping a pick written meanwhile",
	afterPick.refusal === undefined ? afterPick.value.settings.map((one) => one.picked) : afterPick.refusal,
	["grey", "top-bar"],
);

console.log(failures === 0 ? "\nlook gate: clean" : `\nlook gate: ${failures} failing`);
process.exit(failures === 0 ? 0 : 1);
