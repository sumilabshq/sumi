import { z } from "zod";
import { check, tally, thrownBy } from "./check-helpers.ts";
import {
	DerivedFill,
	SumiProfileSchema,
	fillKeyOf,
	namedSlot,
	plugin,
	pluginWithSlots,
	profileRefusalsOf,
	slot,
	slotFillsOf,
	slotReaderOf,
	startOrderOf,
} from "../packages/shared/plugin-framework/src/index.ts";
import type { ListSlot, Plugin, SlotFills } from "../packages/shared/plugin-framework/src/index.ts";

function shownKeysIn(slotFills: SlotFills, name: string): readonly (readonly [string, string])[] {
	return (slotFills.slots.get(name)?.fills ?? []).map((each) => [each.id, each.pluginId] as const);
}

function idsOf(plugins: readonly Plugin[]): readonly string[] {
	return plugins.map((each) => each.id);
}

function titledSlot(): ListSlot<z.ZodObject<{ title: z.ZodString }>> {
	return slot()
		.item(z.object({ title: z.string() }))
		.list();
}

function sizedSlot(): ListSlot<z.ZodObject<{ title: z.ZodString; size: z.ZodNumber }>> {
	return slot()
		.item(z.object({ title: z.string(), size: z.number() }))
		.list();
}

const layoutPlate = titledSlot();
const layout = pluginWithSlots(plugin("layout").declare(layoutPlate), { plate: namedSlot("plate", layoutPlate) });
const menuDoors = slot()
	.item(z.strictObject({ key: z.string().min(1) }))
	.list();
const menu = pluginWithSlots(plugin("command-menu").declare(menuDoors), { doors: namedSlot("doors", menuDoors) });
const composerStatus = slot()
	.item(z.object({ text: z.string() }))
	.list();
const chatTitle = slot().item(z.object({ text: z.string().default("Chat") }));
const chat = pluginWithSlots(
	plugin("chat")
		.require(layout)
		.optional(menu)
		.declare(composerStatus, chatTitle)
		.fill(
			layout.plate.add({ id: "chat", title: "Chat" }),
			chatTitle.set({}),
			menu.doors.add({ id: "ask", key: "mod+i" }),
		),
	{
		composerStatus: namedSlot("composer-status", composerStatus),
		chatTitle: namedSlot("chat-title", chatTitle),
	},
);
const agents = plugin("background-agents")
	.require(chat)
	.fill(chat.composerStatus.add({ id: "agents", text: "3 background agents" }), chat.chatTitle.set({ text: "Agents" }));
const usage = plugin("usage-meter")
	.require(chat)
	.fill(
		chat.composerStatus.add({ id: "usage", text: "12k tokens" }),
		chat.composerStatus.add({ id: "agents", text: "agents, counted by usage" }),
	);
const installedPlugins = [usage, agents, chat, layout, menu];
const profile = SumiProfileSchema.parse({
	plugins: ["layout", "chat", "background-agents", "usage-meter", "command-menu"],
});

export function refusedByTypes(): void {
	// @ts-expect-error
	layout.plate.add({ title: "a list fill without an id" });
	// @ts-expect-error
	chat.chatTitle.set({ text: 3 });
	// @ts-expect-error
	chat.chatTitle.add({ id: "single", text: "a single slot has no add" });
	// @ts-expect-error
	layout.plate.set({ title: "a list slot has no set" });
}

check(
	"a slot's name before it is named throws, naming the fix",
	thrownBy(() => titledSlot().name),
	"a slot has no name yet: its name comes from the variable it is exported as, written in by the generator; run npm run generate",
);
check(
	"a slot handed to a second plugin throws, naming both owners",
	thrownBy(() => pluginWithSlots(plugin("other-layout"), { plate: layout.plate })),
	'a slot is already named "layout", and is named "other-layout" again: name each building block once',
);
check(
	"a slot is named by its owner and its own name, joined by a dot",
	[layout.id, layout.plate.name, chat.chatTitle.name],
	["layout", "layout.plate", "chat.chat-title"],
);
check(
	"a plugin id that is not kebab case throws where it is named",
	thrownBy(() => plugin("Chat")),
	'"Chat" is not a name: one kebab-case segment of a-z, such as "command-menu", no digits, capitals, "." or "/"',
);
check(
	"a slot name that is not kebab case throws where it is named",
	thrownBy(() => namedSlot("chat/title", titledSlot())) !== "",
	true,
);
check(
	"a slot whose key is a field of every plugin is refused",
	thrownBy(() => pluginWithSlots(plugin("fielded"), { id: namedSlot("id", titledSlot()) })),
	"plugin fielded declares a slot named id, which is a field of every plugin: rename the slot's constant",
);

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

const loopEnd = plugin("loop-end");
const loopMiddle = plugin("loop-middle").require(loopEnd);
const loopEndClosed = plugin("loop-end").require(loopMiddle);
check(
	"a requirement cycle is refused on both sides",
	startOrderOf([loopEndClosed, loopMiddle], ["loop-end", "loop-middle"]).refusals,
	[
		"plugin loop-middle requires loop-end, which requires it back",
		"plugin loop-end requires loop-middle, which did not start",
	],
);

const wantsBack = plugin("wants-back");
const wantsFirst = plugin("wants-first").optional(wantsBack);
const wantsBackClosed = plugin("wants-back").optional(wantsFirst);
const optionalLoop = startOrderOf([wantsFirst, wantsBackClosed], ["wants-first", "wants-back"]);
check(
	"two plugins wanting each other optionally both start, with no refusal",
	[[...idsOf(optionalLoop.plugins)].sort(), optionalLoop.refusals],
	[["wants-back", "wants-first"], []],
);

check(
	"a profile listing an unknown or repeated plugin is refused",
	profileRefusalsOf([layout, layout], { plugins: ["layout", "ghost", "layout"] }),
	[
		"two installed plugins are both named layout",
		"sumi.profile.json lists plugin layout twice",
		"sumi.profile.json lists plugin ghost, which is not installed",
	],
);
check(
	"a profile with a key it does not know, such as locked, is refused when parsed",
	SumiProfileSchema.safeParse({ plugins: [], locked: [] }).success,
	false,
);
check(
	"a profile with an unknown key is refused when parsed",
	SumiProfileSchema.safeParse({ plugins: [], overrides: [] }).success,
	false,
);

const slotFills = slotFillsOf(startOrder.plugins, profile.plugins);
check(
	"a slot is shown under its full name",
	[...slotFills.slots.keys()],
	["layout.plate", "command-menu.doors", "chat.composer-status", "chat.chat-title"],
);
check("a list slot shows its fill", shownKeysIn(slotFills, "layout.plate"), [["chat", "chat"]]);
check("a list slot shows fills in profile order", shownKeysIn(slotFills, "chat.composer-status"), [
	["agents", "background-agents"],
	["usage", "usage-meter"],
]);
check("a single slot shows the fill of the plugin listed first", shownKeysIn(slotFills, "chat.chat-title"), [
	["chat.chat-title", "chat"],
]);
check("a shown item is the parsed item, defaults applied", slotFills.slots.get("chat.chat-title")?.fills[0]?.item, {
	text: "Chat",
});
check(
	"a list fill's id is kept apart from its item, so a strict schema accepts it",
	slotFills.slots.get("command-menu.doors")?.fills,
	[{ pluginId: "chat", id: "ask", item: { key: "mod+i" } }],
);
check("valid fills raise no refusal", slotFills.refusals, []);

const slotFillsWithoutMenu = slotFillsOf(withoutMenu.plugins, ["layout", "chat"]);
check("a fill of an optional plugin that is off is skipped, not refused", slotFillsWithoutMenu.refusals, []);
check("and its slot is not shown", slotFillsWithoutMenu.slots.has("command-menu.doors"), false);

const usageFirst = slotFillsOf(startOrder.plugins, ["layout", "chat", "usage-meter", "background-agents"]);
check("moving a plugin up the profile lets its fill win the same id", shownKeysIn(usageFirst, "chat.composer-status"), [
	["usage", "usage-meter"],
	["agents", "usage-meter"],
]);

check(
	"a list fill with no id, past the types, throws naming the slot",
	thrownBy(() => Reflect.apply(layout.plate.add, layout.plate, [{ title: "no id" }])),
	"a fill of slot layout.plate, a list, needs a non-empty string id: add({ id, … })",
);
check(
	"a list fill with an empty id throws",
	thrownBy(() => layout.plate.add({ id: "", title: "empty id" })) !== "",
	true,
);

const onePages = slot().item(z.string());
const otherPages = slot().item(z.string());
const one = pluginWithSlots(plugin("one").declare(onePages), { pages: namedSlot("pages", onePages) });
const other = pluginWithSlots(plugin("other").declare(otherPages), { pages: namedSlot("pages", otherPages) });
const twoPages = slotFillsOf([one, other], ["one", "other"]);
check(
	"two plugins may each declare a slot of the same name",
	[[...twoPages.slots.keys()], twoPages.refusals],
	[["one.pages", "other.pages"], []],
);

const redeclaring = plugin("redeclaring").declare(layout.plate);
check(
	"a slot declared by a plugin other than the one its name places it under is refused",
	slotFillsOf([layout, redeclaring], ["layout", "redeclaring"]).refusals,
	["plugin redeclaring declares slot layout.plate, which is named as a slot of plugin layout"],
);

const declaredTwice = pluginWithSlots(plugin("layout").declare(layoutPlate, layoutPlate), { plate: layoutPlate });
check("a second declaration of the same slot is refused", slotFillsOf([declaredTwice], ["layout"]).refusals, [
	"slot layout.plate is declared by layout and again by layout",
]);

const strayShelf = slot().item(z.object({ title: z.string() }));
namedSlot("shelf", strayShelf);
const shelfless = plugin("shelfless").declare(strayShelf);
check(
	"a slot its plugin's generated namespace does not name is refused, naming the fix",
	slotFillsOf([shelfless], ["shelfless"]).refusals,
	["plugin shelfless declares slot shelf, which no generated plugin namespace names as its own; run npm run generate"],
);
const firstTwin = slot().item(z.string());
const secondTwin = slot().item(z.string());
const twice = pluginWithSlots(plugin("twice").declare(firstTwin, secondTwin), {
	firstTwin: namedSlot("pages", firstTwin),
	secondTwin: namedSlot("pages", secondTwin),
});
check("a plugin declaring two slots of one name is refused", slotFillsOf([twice], ["twice"]).refusals, [
	"plugin twice declares two slots named twice.pages",
]);

const nowhereSpot = slot().item(z.string());
const nowhere = pluginWithSlots(plugin("nowhere").declare(nowhereSpot), { spot: namedSlot("spot", nowhereSpot) });
const orphan = plugin("orphan").fill(nowhere.spot.set("x"));
check("a fill of a slot no started plugin declares is refused", slotFillsOf([orphan], ["orphan"]).refusals, [
	"plugin orphan fills slot nowhere.spot, which no started plugin declares",
]);

const stranger = plugin("stranger").fill(layout.plate.add({ id: "stranger", title: "Stranger" }));
check(
	"a fill of a plugin the filler neither requires nor marks optional is refused",
	slotFillsOf([layout, stranger], ["layout", "stranger"]).refusals,
	["plugin stranger fills slot layout.plate without requiring layout or marking it optional"],
);

const lookalikePlate = slot()
	.item(z.object({ count: z.number() }))
	.list();
const lookalikeLayout = pluginWithSlots(plugin("layout").declare(lookalikePlate), {
	plate: namedSlot("plate", lookalikePlate),
});
const lookalike = plugin("lookalike")
	.require(layout)
	.fill(lookalikeLayout.plate.add({ id: "lookalike", count: 1 }));
check(
	"a fill of a lookalike slot of the same full name is refused even when the filler requires its namesake's owner",
	slotFillsOf([layout, lookalike], ["layout", "lookalike"]).refusals,
	["plugin lookalike fills slot layout.plate, which no started plugin declares"],
);

const undeclaredDependency = plugin("undeclared-dependency")
	.require(layout)
	.fill(layout.plate.add({ id: "undeclared", title: "Undeclared" }), chat.chatTitle.set({}));
check(
	"a fill of a slot owned by a plugin it does not depend on is refused, naming the owner",
	slotFillsOf([layout, chat, undeclaredDependency], ["layout", "chat", "undeclared-dependency"]).refusals,
	["plugin undeclared-dependency fills slot chat.chat-title without requiring chat or marking it optional"],
);

const emptyDoor = plugin("empty-door")
	.require(menu)
	.fill(menu.doors.add({ id: "empty", key: "" }));
check(
	"a fill the slot's schema refuses, with the types satisfied, is refused",
	slotFillsOf([menu, emptyDoor], ["command-menu", "empty-door"]).refusals,
	["plugin empty-door fills slot command-menu.doors with an item the slot refuses"],
);

const keyDoor = plugin("key-door")
	.require(menu)
	.fill(menu.doors.add({ id: "keys", key: "K" }));
const keyDoorFills = slotFillsOf([menu, keyDoor], ["command-menu", "key-door"]);
check(
	"the declaring plugin reads its slot's fills, parsed, each with its id",
	slotReaderOf(keyDoorFills, menu)
		.fillsOf(menu.doors)
		.map(({ id, key }) => [id, key]),
	[["keys", "K"]],
);
check(
	"a plugin reading a slot it does not declare is refused, even the one it fills",
	thrownBy(() => slotReaderOf(keyDoorFills, keyDoor).fillsOf(menu.doors)),
	"plugin key-door reads slot command-menu.doors, which it does not declare: a plugin reads only its own slots",
);

const filesViewers = sizedSlot();
const files = pluginWithSlots(
	plugin("files")
		.require(layout)
		.declare(filesViewers)
		.fill(
			layout.plate.addFrom(filesViewers, (viewers) =>
				viewers.map((viewer) => ({ id: viewer.id, title: viewer.title })),
			),
		),
	{ viewers: namedSlot("viewers", filesViewers) },
);
const markdownViewer = plugin("markdown-viewer")
	.require(files)
	.fill(files.viewers.add({ id: "markdown", title: "Markdown", size: 1 }));
const imageViewer = plugin("image-viewer")
	.require(files)
	.fill(files.viewers.add({ id: "image", title: "Image", size: 2 }));
const viewerFills = slotFillsOf(
	[layout, files, markdownViewer, imageViewer],
	["layout", "files", "markdown-viewer", "image-viewer"],
);
check(
	"a plugin fills another slot from its own slot's fills, one item per source fill, under its own name",
	shownKeysIn(viewerFills, "layout.plate"),
	[
		["markdown", "files"],
		["image", "files"],
	],
);
check(
	"a built fill holds the item its function built",
	viewerFills.slots.get("layout.plate")?.fills.map(({ item }) => item),
	[{ title: "Markdown" }, { title: "Image" }],
);
check("building fills from a slot raises no refusal", viewerFills.refusals, []);
check(
	"the owner of the target slot reads built fills like any other",
	slotReaderOf(viewerFills, layout)
		.fillsOf(layout.plate)
		.map(({ id, title }) => [id, title]),
	[
		["markdown", "Markdown"],
		["image", "Image"],
	],
);

const filteringSized = sizedSlot();
const filtering = pluginWithSlots(
	plugin("filtering")
		.require(layout)
		.declare(filteringSized)
		.fill(
			filteringSized.add({ id: "small", title: "Small", size: 1 }),
			filteringSized.add({ id: "big", title: "Big", size: 9 }),
			layout.plate.addFrom(filteringSized, (items) =>
				items.filter(({ size }) => size > 5).map(({ id, title }) => ({ id: `${id}-plate`, title })),
			),
		),
	{ sized: namedSlot("sized", filteringSized) },
);
check(
	"a building function may drop source fills",
	shownKeysIn(slotFillsOf([layout, filtering], ["layout", "filtering"]), "layout.plate"),
	[["big-plate", "filtering"]],
);

const countedSlot = titledSlot();
const counting = pluginWithSlots(
	plugin("counting")
		.require(chat)
		.declare(countedSlot)
		.fill(
			countedSlot.add({ id: "one", title: "One" }),
			countedSlot.add({ id: "two", title: "Two" }),
			chat.chatTitle.setFrom(countedSlot, (items) => ({ text: `${items.length} counted` })),
		),
	{ counted: namedSlot("counted", countedSlot) },
);
const countedFills = slotFillsOf([layout, chat, counting], ["counting", "layout", "chat"]);
check(
	"a building function may fold many source fills into the one item of a single slot",
	countedFills.slots.get("chat.chat-title")?.fills,
	[{ pluginId: "counting", id: "chat.chat-title", item: { text: "2 counted" } }],
);

const firstSlot = titledSlot();
const secondSlot = titledSlot();
const chain = pluginWithSlots(
	plugin("chain")
		.require(layout)
		.declare(firstSlot, secondSlot)
		.fill(
			layout.plate.addFrom(secondSlot, (items) => items.map(({ id, title }) => ({ id: `${id}-plate`, title }))),
			secondSlot.addFrom(firstSlot, (items) =>
				items.map(({ id, title }) => ({ id: `${id}-second`, title: title.toUpperCase() })),
			),
			firstSlot.add({ id: "seed", title: "seed" }),
		),
	{ first: namedSlot("first", firstSlot), second: namedSlot("second", secondSlot) },
);
const chainFills = slotFillsOf([layout, chain], ["layout", "chain"]);
check(
	"a built slot feeds the next build, whatever order the fills are written in",
	[shownKeysIn(chainFills, "layout.plate"), chainFills.slots.get("layout.plate")?.fills[0]?.item],
	[[["seed-second-plate", "chain"]], { title: "SEED" }],
);

const loopFirst = titledSlot();
const loopSecond = titledSlot();
const looping = pluginWithSlots(
	plugin("looping")
		.declare(loopFirst, loopSecond)
		.fill(
			loopSecond.addFrom(loopFirst, (items) => items),
			loopFirst.addFrom(loopSecond, (items) => items),
		),
	{ loopFirst: namedSlot("loop-first", loopFirst), loopSecond: namedSlot("loop-second", loopSecond) },
);
check("two slots built from each other are both refused as a loop", slotFillsOf([looping], ["looping"]).refusals, [
	"plugin looping derives fills of slot looping.loop-second from slot looping.loop-first, which waits on those fills: a loop",
	"plugin looping derives fills of slot looping.loop-first from slot looping.loop-second, which waits on those fills: a loop",
]);

const selfSlot = titledSlot();
const selfBuilding = pluginWithSlots(
	plugin("self-building")
		.declare(selfSlot)
		.fill(selfSlot.addFrom(selfSlot, (items) => items)),
	{ self: namedSlot("self", selfSlot) },
);
check("a slot built from itself is refused as a loop", slotFillsOf([selfBuilding], ["self-building"]).refusals, [
	"plugin self-building derives fills of slot self-building.self from slot self-building.self, which waits on those fills: a loop",
]);

const borrowing = plugin("borrowing")
	.require(layout, files)
	.fill(layout.plate.addFrom(files.viewers, (viewers) => viewers.map(({ id, title }) => ({ id, title }))));
check(
	"building from a slot the plugin does not declare is refused, even from a plugin it requires",
	slotFillsOf([layout, files, borrowing], ["layout", "files", "borrowing"]).refusals,
	[
		"plugin borrowing derives fills of slot layout.plate from slot files.viewers, which it does not declare: a plugin derives only from its own slots",
	],
);

const unownedSized = sizedSlot();
const unownedBuild = pluginWithSlots(
	plugin("unowned-build")
		.declare(unownedSized)
		.fill(
			unownedSized.add({ id: "only", title: "Only", size: 1 }),
			layout.plate.addFrom(unownedSized, (items) => items.map(({ id, title }) => ({ id, title }))),
		),
	{ sized: namedSlot("sized", unownedSized) },
);
check(
	"a built fill of a slot owned by a plugin the builder does not depend on is refused, like a plain fill",
	slotFillsOf([layout, unownedBuild], ["layout", "unowned-build"]).refusals,
	["plugin unowned-build fills slot layout.plate without requiring layout or marking it optional"],
);

function pluginBuildingPlate(id: string, derive: unknown): Plugin {
	const sized = sizedSlot();
	const built: unknown = Reflect.apply(layout.plate.addFrom, layout.plate, [sized, derive]);

	if (!(built instanceof DerivedFill)) {
		throw new Error(`plate built for ${id} is not a derived fill`);
	}

	return pluginWithSlots(
		plugin(id)
			.require(layout)
			.declare(sized)
			.fill(sized.add({ id: "seed", title: "Seed", size: 1 }), built),
		{ sized: namedSlot("sized", sized) },
	);
}

function buildRefusalsOf(id: string, derive: unknown): readonly string[] {
	return slotFillsOf([layout, pluginBuildingPlate(id, derive)], ["layout", id]).refusals;
}

check(
	"a built item the target slot's schema refuses is refused, past the types",
	buildRefusalsOf("wrong-item", () => [{ id: "bad", title: 3 }]),
	["plugin wrong-item fills slot layout.plate with an item the slot refuses"],
);
check(
	"a built item of a list slot with no id is refused, naming why",
	buildRefusalsOf("no-id", () => [{ title: "No id" }]),
	[
		"plugin no-id derives fills of slot layout.plate from slot no-id.sized, and that failed: a fill of slot layout.plate, a list, needs a non-empty string id: add({ id, … })",
	],
);
check(
	"a building function that throws is refused with its error",
	buildRefusalsOf("throwing", () => {
		throw new Error("viewer list unreadable");
	}),
	[
		"plugin throwing derives fills of slot layout.plate from slot throwing.sized, and that failed: viewer list unreadable",
	],
);
check(
	"a building function answering something that is not a list is refused",
	buildRefusalsOf("not-list", () => ({ id: "one", title: "One" })),
	[
		"plugin not-list derives fills of slot layout.plate from slot not-list.sized, and answered something that is not a list",
	],
);
check(
	"addFrom with a second argument that is not a function throws, naming the shape",
	thrownBy(() => Reflect.apply(layout.plate.addFrom, layout.plate, [files.viewers, "not a function"])),
	"a fill of slot layout.plate built from another slot takes that slot and a function: addFrom(sourceSlot, (items) => [ … ])",
);
check(
	"addFrom with a first argument that is not a slot, and a function, throws",
	thrownBy(() => Reflect.apply(layout.plate.addFrom, layout.plate, [{ title: "not a slot" }, () => []])),
	"a fill of slot layout.plate built from another slot takes that slot and a function: addFrom(sourceSlot, (items) => [ … ])",
);

const listedNames = slot().item(z.string());
const lists = pluginWithSlots(plugin("lists").declare(listedNames), { names: namedSlot("names", listedNames) });
check(
	"a fill built from a slot whose items are not objects throws, past the types, naming both slots",
	thrownBy(() => Reflect.apply(layout.plate.addFrom, layout.plate, [lists.names, () => []])),
	"a fill of slot layout.plate is built only from a slot whose items are objects, and slot lists.names holds other items",
);

export const builtByTypes: DerivedFill = layout.plate.addFrom(files.viewers, (viewers) =>
	viewers.map((viewer) => ({ id: `${viewer.id}-${viewer.size}`, title: viewer.title })),
);

export function buildRefusedByTypes(): void {
	// @ts-expect-error
	slot().item(z.string()).list();
	// @ts-expect-error
	layout.plate.addFrom(lists.names, () => []);
	// @ts-expect-error
	layout.plate.addFrom(files.viewers, (viewers) => viewers.map((viewer) => ({ title: viewer.title })));
	// @ts-expect-error
	layout.plate.addFrom(files.viewers, (viewers) => viewers.map((viewer) => ({ id: viewer.id, title: viewer.size })));
}

check(
	"a list slot over items that are not objects throws, past the types, naming the slot",
	thrownBy(() => Reflect.apply(slot().item(z.string()).list, slot().item(z.string()), [])),
	"slot (not named yet) is a list, and a list holds objects: give .item() a z.object() schema",
);

check(
	"a list fill whose id holds a dot throws, naming the slot and the id",
	thrownBy(() => layout.plate.add({ id: "chat.plate", title: "dotted" })),
	'a fill of slot layout.plate has the id "chat.plate": a list fill id holds no ".", since its key is the plugin id and the fill id joined by one',
);

check(
	"a fill's key is its plugin id and its id joined by a dot",
	fillKeyOf({ pluginId: "chat", id: "plate", item: null }),
	"chat.plate",
);

const shownPlate = slot().item(z.object({ title: z.string() }));
const shownFrom = pluginWithSlots(plugin("shown-from").declare(shownPlate), { plate: namedSlot("plate", shownPlate) });
check(
	"a reader reads a declared slot through its list() handle, the same slot by identity",
	thrownBy(() => slotReaderOf(slotFillsOf([shownFrom], ["shown-from"]), shownFrom).fillsOf(shownPlate.list())),
	"",
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("plugin framework: all checks passed");
