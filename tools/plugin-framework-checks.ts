import { z } from "zod";
import { check, tally, thrownBy } from "./check-helpers.ts";
import {
	Fill,
	SumiProfileSchema,
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

const PlateSlot = slot("plate")
	.item(z.object({ title: z.string() }))
	.list();
const StatusSlot = slot("composer-status")
	.item(z.object({ text: z.string() }))
	.list();
const TitleSlot = slot("chat-title").item(z.object({ text: z.string().default("Chat") }));
const DoorsSlot = slot("doors")
	.item(z.object({ key: z.string() }))
	.list();

const LayoutPlugin = plugin("layout").declare(PlateSlot);
const MenuPlugin = plugin("command-menu").declare(DoorsSlot);
const ChatPlugin = plugin("chat")
	.require(LayoutPlugin)
	.optional(MenuPlugin)
	.declare(StatusSlot, TitleSlot)
	.fill(PlateSlot({ id: "chat", title: "Chat" }), TitleSlot({}), DoorsSlot({ id: "ask", key: "mod+i" }));
const AgentsPlugin = plugin("background-agents")
	.require(ChatPlugin)
	.fill(StatusSlot({ id: "agents", text: "3 background agents" }), TitleSlot({ text: "Agents" }));
const UsagePlugin = plugin("usage-meter")
	.require(ChatPlugin)
	.fill(
		StatusSlot({ id: "usage", text: "12k tokens" }),
		StatusSlot({ id: "agents", text: "agents, counted by usage" }),
	);
const installedPlugins = [UsagePlugin, AgentsPlugin, ChatPlugin, LayoutPlugin, MenuPlugin];
const profile = SumiProfileSchema.parse({
	plugins: ["layout", "chat", "background-agents", "usage-meter", "command-menu"],
});

export function typedOnly(): void {
	// @ts-expect-error
	PlateSlot({ title: "a list fill without an id" });
	// @ts-expect-error
	TitleSlot({ text: 3 });
}

const startOrder = startOrderOf(installedPlugins, profile.plugins);
check("a plugin starts after the plugins it requires and the optional ones enabled", idsOf(startOrder.plugins), [
	"layout",
	"command-menu",
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

const withoutMenu = startOrderOf(installedPlugins, ["layout", "chat"]);
check("a plugin starts when an optional plugin it wants is off", idsOf(withoutMenu.plugins), ["layout", "chat"]);

const LoopEnd = plugin("loop-end");
const LoopMiddle = plugin("loop-middle").require(LoopEnd);
const LoopEndClosed = plugin("loop-end").require(LoopMiddle);
check(
	"a requirement cycle is refused on both sides",
	startOrderOf([LoopEndClosed, LoopMiddle], ["loop-end", "loop-middle"]).refusals,
	[
		"plugin loop-middle requires loop-end, which requires it back",
		"plugin loop-end requires loop-middle, which did not start",
	],
);

check(
	"a profile listing an unknown or repeated plugin, or locking one it does not enable, is refused",
	profileRefusalsOf([LayoutPlugin, LayoutPlugin], { plugins: ["layout", "ghost", "layout"], locked: ["chat"] }),
	[
		"two installed plugins are both named layout",
		"sumi.profile.json lists plugin layout twice",
		"sumi.profile.json lists plugin ghost, which is not installed",
		"sumi.profile.json locks plugin chat, which it does not enable: a locked plugin cannot be disabled",
	],
);
check("a profile without locked plugins locks none", profile.locked, []);
check(
	"a profile with an unknown key is refused when parsed",
	SumiProfileSchema.safeParse({ plugins: [], overrides: [] }).success,
	false,
);
check("a plugin id that is not kebab case throws where it is declared", thrownBy(() => plugin("Chat")) !== "", true);

const slotFills = slotFillsOf(startOrder.plugins, profile.plugins);
check(
	"a slot is named by the plugin that declares it",
	[...slotFills.slots.keys()],
	["layout/plate", "command-menu/doors", "chat/composer-status", "chat/chat-title"],
);
check("a list slot shows its fill", fillsShownIn(slotFills, "layout/plate"), [["chat", "chat"]]);
check("a list slot shows fills in profile order", fillsShownIn(slotFills, "chat/composer-status"), [
	["agents", "background-agents"],
	["usage", "usage-meter"],
]);
check("a single slot shows the fill of the plugin listed first", fillsShownIn(slotFills, "chat/chat-title"), [
	["chat-title", "chat"],
]);
check("a shown item is the parsed item, defaults applied", slotFills.slots.get("chat/chat-title")?.fills[0]?.item, {
	text: "Chat",
});
check("a fill of an optional plugin that started is shown", fillsShownIn(slotFills, "command-menu/doors"), [
	["ask", "chat"],
]);
check("valid fills raise no refusal", slotFills.refusals, []);

const menuOff = slotFillsOf(withoutMenu.plugins, ["layout", "chat"]);
check("a fill of an optional plugin that is off is skipped, not refused", menuOff.refusals, []);
check("and its slot is not shown", menuOff.slots.has("command-menu/doors"), false);

const usageFirst = slotFillsOf(startOrder.plugins, ["layout", "chat", "usage-meter", "background-agents"]);
check(
	"moving a plugin up the profile lets its fill win the same id",
	fillsShownIn(usageFirst, "chat/composer-status"),
	[
		["usage", "usage-meter"],
		["agents", "usage-meter"],
	],
);

const OwnPagesSlot = slot("pages").item(z.string());
const OtherPagesSlot = slot("pages").item(z.string());
const OnePlugin = plugin("one").declare(OwnPagesSlot);
const OtherPlugin = plugin("other").declare(OtherPagesSlot);
const twoPages = slotFillsOf([OnePlugin, OtherPlugin], ["one", "other"]);
check(
	"two plugins may each declare a slot of the same name",
	[[...twoPages.slots.keys()], twoPages.refusals],
	[["one/pages", "other/pages"], []],
);

const SquatterPlugin = plugin("squatter").declare(PlateSlot);
check(
	"a second declaration of the same slot is refused",
	slotFillsOf([LayoutPlugin, SquatterPlugin], ["layout", "squatter"]).refusals,
	["slot layout/plate is declared by layout and again by squatter"],
);
check(
	"a plugin declaring two slots of one name is refused",
	slotFillsOf([plugin("twice").declare(OwnPagesSlot, OtherPagesSlot)], ["twice"]).refusals,
	["plugin twice declares two slots named pages"],
);

const OrphanPlugin = plugin("orphan").fill(slot("nowhere").item(z.string())("x"));
check("a fill of an undeclared slot is refused", slotFillsOf([OrphanPlugin], ["orphan"]).refusals, [
	"plugin orphan fills slot nowhere, which no started plugin declares",
]);

const StrangerPlugin = plugin("stranger").fill(PlateSlot({ id: "stranger", title: "Stranger" }));
check(
	"a fill of a plugin the filler neither requires nor marks optional is refused",
	slotFillsOf([LayoutPlugin, StrangerPlugin], ["layout", "stranger"]).refusals,
	["plugin stranger fills slot layout/plate without requiring layout or marking it optional"],
);

const LiarPlugin = plugin("liar")
	.require(LayoutPlugin)
	.fill(
		slot("plate")
			.item(z.object({ count: z.number() }))
			.list()({ id: "bad", count: 1 }),
	);
check(
	"a fill of a slot nobody declares stays refused even when the filler requires a plugin with that slot name",
	slotFillsOf([LayoutPlugin, LiarPlugin], ["layout", "liar"]).refusals,
	["plugin liar fills slot plate, which no started plugin declares"],
);

const WrongItemPlugin = plugin("wrong-item")
	.require(LayoutPlugin)
	.fill(PlateSlot({ id: "wrong", title: "Wrong" }), TitleSlot({}));
const wrongItem = slotFillsOf([LayoutPlugin, ChatPlugin, WrongItemPlugin], ["layout", "chat", "wrong-item"]);
check("a fill of a slot owned by a plugin it does not depend on is refused, naming the owner", wrongItem.refusals, [
	"plugin wrong-item fills slot chat/chat-title without requiring chat or marking it optional",
]);

const untypedFill: unknown = Reflect.apply(PlateSlot, undefined, [{ id: "bad", title: 3 }]);
const BadItemPlugin = plugin("bad-item").require(LayoutPlugin);
const badItem = untypedFill instanceof Fill ? BadItemPlugin.fill(untypedFill) : BadItemPlugin;
check(
	"a fill the slot's schema refuses, past the types, is refused",
	slotFillsOf([LayoutPlugin, badItem], ["layout", "bad-item"]).refusals,
	["plugin bad-item fills slot layout/plate with an item the slot refuses"],
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("plugin framework: all checks passed");
