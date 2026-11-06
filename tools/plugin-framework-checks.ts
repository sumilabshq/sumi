import { z } from "zod";
import { check, tally, thrownBy } from "./check-helpers.ts";
import {
	SumiProfileSchema,
	fill,
	plugin,
	profileRefusalsOf,
	slot,
	slotFillsOf,
	startOrderOf,
} from "../packages/shared/plugin-framework/src/index.ts";
import type { Plugin, SlotFills } from "../packages/shared/plugin-framework/src/index.ts";

function fillsShownIn(slotFills: SlotFills, name: string): readonly (readonly [string, string])[] {
	return (slotFills.slots.get(name)?.fills ?? []).map((each) => [each.id, each.pluginId] as const);
}

function idsOf(plugins: readonly Plugin[]): readonly string[] {
	return plugins.map((each) => each.id);
}

const plateSlot = slot("plate")
	.item(z.object({ title: z.string() }))
	.list();
const statusSlot = slot("composer-status")
	.item(z.object({ text: z.string() }))
	.list();
const titleSlot = slot("chat-title").item(z.object({ text: z.string().default("Chat") }));

const layoutPlugin = plugin("layout").declares(plateSlot);
const chatPlugin = plugin("chat")
	.requires(layoutPlugin)
	.declares(statusSlot, titleSlot)
	.fills(fill(plateSlot, "chat").item({ title: "Chat" }), fill(titleSlot, "chat-title").item({}));
const agentsPlugin = plugin("background-agents")
	.requires(chatPlugin)
	.fills(
		fill(statusSlot, "agents").item({ text: "3 background agents" }),
		fill(titleSlot, "agents-title").item({ text: "Agents" }),
	);
const usagePlugin = plugin("usage-meter")
	.requires(chatPlugin)
	.fills(
		fill(statusSlot, "usage").item({ text: "12k tokens" }),
		fill(statusSlot, "agents").item({ text: "agents, counted by usage" }),
	);
const installedPlugins = [usagePlugin, agentsPlugin, chatPlugin, layoutPlugin];
const profile = SumiProfileSchema.parse({
	plugins: ["layout", "chat", "background-agents", "usage-meter"],
});

const startOrder = startOrderOf(installedPlugins, profile.plugins);
check("a plugin starts after the plugins it requires", idsOf(startOrder.plugins), [
	"layout",
	"chat",
	"background-agents",
	"usage-meter",
]);
check("a full profile starts with no refusal", startOrder.refusals, []);

check(
	"a plugin whose requirement is off is refused, and so is what requires it",
	startOrderOf(installedPlugins, ["chat", "background-agents"]).refusals,
	["plugin chat requires layout, which is not enabled", "plugin background-agents requires chat, which did not start"],
);

const loopEnd = plugin("loop-end");
const loopMiddle = plugin("loop-middle").requires(loopEnd);
const loopEndClosed = plugin("loop-end").requires(loopMiddle);
check(
	"a requirement cycle is refused on both sides",
	startOrderOf([loopEndClosed, loopMiddle], ["loop-end", "loop-middle"]).refusals,
	[
		"plugin loop-middle requires loop-end, which requires it back",
		"plugin loop-end requires loop-middle, which did not start",
	],
);

check(
	"a profile listing an unknown or repeated plugin is refused",
	profileRefusalsOf([layoutPlugin, layoutPlugin], { plugins: ["layout", "ghost", "layout"] }),
	[
		"two installed plugins are both named layout",
		"sumi.profile.json lists plugin layout twice",
		"sumi.profile.json lists plugin ghost, which is not installed",
	],
);
check(
	"a profile with an unknown key is refused when parsed",
	SumiProfileSchema.safeParse({ plugins: [], overrides: [] }).success,
	false,
);
check("a plugin id that is not kebab case throws where it is declared", thrownBy(() => plugin("Chat")) !== "", true);

const slotFills = slotFillsOf(startOrder.plugins, profile.plugins);
check("a list slot shows its fill", fillsShownIn(slotFills, "plate"), [["chat", "chat"]]);
check("a list slot shows fills in profile order", fillsShownIn(slotFills, "composer-status"), [
	["agents", "background-agents"],
	["usage", "usage-meter"],
]);
check("a single slot shows the fill of the plugin listed first", fillsShownIn(slotFills, "chat-title"), [
	["chat-title", "chat"],
]);
check("a shown item is the parsed item, defaults applied", slotFills.slots.get("chat-title")?.fills[0]?.item, {
	text: "Chat",
});
check("valid fills raise no refusal", slotFills.refusals, []);

const usageFirst = slotFillsOf(startOrder.plugins, ["layout", "chat", "usage-meter", "background-agents"]);
check("moving a plugin up the profile lets its fill win the same id", fillsShownIn(usageFirst, "composer-status"), [
	["usage", "usage-meter"],
	["agents", "usage-meter"],
]);

const squatter = plugin("squatter").declares(slot("plate").item(z.object({ title: z.string() })));
check(
	"a second declaration of a slot is refused",
	slotFillsOf([layoutPlugin, squatter], ["layout", "squatter"]).refusals,
	["slot plate is declared by layout and again by squatter"],
);

const orphan = plugin("orphan").fills(fill(slot("nowhere").item(z.string()), "x").item("x"));
check("a fill of an undeclared slot is refused", slotFillsOf([orphan], ["orphan"]).refusals, [
	"plugin orphan fills slot nowhere, which no started plugin declares",
]);

const liar = plugin("liar").fills(fill(slot("plate").item(z.number()), "bad").item(1));
check("a fill the owner's schema refuses is refused", slotFillsOf([layoutPlugin, liar], ["layout", "liar"]).refusals, [
	"plugin liar fills slot plate with an item the slot refuses",
]);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("plugin framework: all checks passed");
