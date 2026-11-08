import { createElement } from "react";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { check, tally, thrownBy } from "./check-helpers.ts";
import {
	MemoryPluginStateStore,
	listPluginSlot,
	plugin,
	pluginSlot,
	pluginWithSlots,
	runtime,
} from "../packages/shared/plugin-framework/src/index.ts";
import type { Plugin, PluginRuntime, SlotFills } from "../packages/shared/plugin-framework/src/index.ts";
import { ListPluginSlot, PluginSlot, PluginSlotsContext } from "../packages/shared/plugin-framework/src/react/index.ts";

function started(plugins: readonly Plugin[]): PluginRuntime {
	return runtime()
		.builtInPlugins(...plugins)
		.state(new MemoryPluginStateStore(plugins.map(({ id }) => id)))
		.start();
}

function drawn(fills: SlotFills): string {
	return renderToStaticMarkup(
		createElement(
			PluginSlotsContext.Provider,
			{ value: fills },
			createElement(PluginSlot, { name: "chat.composer-model", props: { chatId: "c-1" } }, "default model"),
			createElement(ListPluginSlot, { name: "chat.composer-badges", props: { chatId: "c-1" } }, "no badges"),
		),
	);
}

function ModelPicker({ chatId }: { readonly chatId: string }): ReactElement {
	return createElement("b", null, `picker ${chatId}`);
}

function ModelBadge({ chatId }: { readonly chatId: string }): ReactElement {
	return createElement("i", null, `badge ${chatId}`);
}

const chat = pluginWithSlots(
	plugin("chat").apply(() => ({
		ask: (): void => undefined,
	})),
	{
		slots: {
			composerModel: pluginSlot<{ readonly chatId: never }>("chat.composer-model"),
			composerBadges: listPluginSlot<{ readonly chatId: never }>("chat.composer-badges"),
		},
	},
);
const late: { replace: ((component: typeof ModelPicker) => void) | null } = { replace: null };
const picker = plugin("picker")
	.require(chat)
	.apply((app) => {
		const { composerModel } = app.use(chat).slots;
		composerModel.replace(ModelPicker);
		late.replace = composerModel.replace;
	});

function badgePlugin(id: string): Plugin {
	return plugin(id)
		.require(chat)
		.apply((app) => app.use(chat).slots.composerBadges.add(ModelBadge));
}

export function refusedByTypes(): void {
	plugin("typed")
		.require(chat)
		.apply((app) => {
			app.use(chat).ask();
			// @ts-expect-error
			app.use(chat).slots.composerModl.replace(ModelPicker);
			// @ts-expect-error
			app.use(chat).slots.composerModel.replace(({ extra }: { readonly extra: string }) => extra);
			// @ts-expect-error
			app.use(chat).slots.composerModel.add(ModelBadge);
			// @ts-expect-error
			app.use(chat).slots.composerBadges.replace(ModelPicker);
		});
}

check("unfilled slots draw their default children", drawn(started([chat]).slotFills), "default modelno badges");
check(
	"a replacement is drawn with the slot's props",
	drawn(started([chat, picker]).slotFills),
	"<b>picker c-1</b>no badges",
);
check(
	"a replacement call after start throws, naming the slot",
	thrownBy(() => late.replace?.(ModelPicker)),
	"slot chat.composer-model.replace was called after start: call it inside apply",
);
check(
	"a list slot draws every added component, in apply order, in place of its default",
	drawn(started([chat, badgePlugin("badge"), badgePlugin("badge-two")]).slotFills),
	"default model<i>badge c-1</i><i>badge c-1</i>",
);

const secondPicker = plugin("second-picker")
	.require(chat)
	.apply((app) => app.use(chat).slots.composerModel.replace(ModelBadge));
const twice = started([chat, picker, secondPicker]);
check(
	"a second replacement of one slot refuses its plugin, and the first stays",
	[twice.refusals, drawn(twice.slotFills)],
	[
		[
			"plugin second-picker could not apply: plugin second-picker replaces slot chat.composer-model, which picker already replaces: one replacement per slot",
		],
		"<b>picker c-1</b>no badges",
	],
);

const failing = plugin("failing")
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.composerModel.replace(ModelBadge);
		throw new Error("broke after filling");
	});
const afterFailure = started([chat, failing, picker]);
check(
	"a plugin that fails after filling leaves no fill, so another may replace the slot",
	[afterFailure.startedIds, drawn(afterFailure.slotFills)],
	[["chat", "picker"], "<b>picker c-1</b>no badges"],
);

const greedy = pluginWithSlots(
	plugin("greedy").apply(() => ({ slots: (): void => undefined })),
	{ slots: { spot: pluginSlot<{}>("greedy.spot") } },
);
check(
	"an API field named slots beside UI slots refuses the plugin using it",
	started([
		greedy,
		plugin("user")
			.require(greedy)
			.apply((app) => app.use(greedy)),
	]).refusals,
	[
		"plugin user could not apply: plugin greedy returns an API field named slots, which its UI slots take: rename the field",
	],
);
check(
	"a slot name that is not the owner's id and one kebab segment throws",
	thrownBy(() => listPluginSlot<{}>("composer-badges")),
	'"composer-badges" is not a slot name: the owner plugin\'s id and the slot, each kebab-case, joined by a dot, such as "chat.composer-model"',
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("plugin slots: all checks passed");
