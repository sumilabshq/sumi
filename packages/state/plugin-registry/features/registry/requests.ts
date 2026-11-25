import { Repeatable, deny } from "@widgetarium/data-framework";
import { command, query } from "#module";
import { dependentsOff, isOn, requirementsOn } from "../../shared/lib/switch-plan.js";
import {
	DisablePlanSchema,
	PluginIdInputSchema,
	RegistrySchema,
	SetEnabledInputSchema,
} from "../../shared/schema/registry.schema.js";
import { entryOf, restartNeededOf } from "./lib/registry-of.js";

export const all = query()
	.public()
	.output(RegistrySchema)
	.handle(async (_input, { switches, catalogue, startedIds }) => {
		const kept = await switches.switches();
		return {
			plugins: catalogue.map((entry) => entryOf(entry, kept)),
			restartNeeded: restartNeededOf(catalogue, kept, startedIds),
		};
	});

export const disablePlan = query()
	.public()
	.input(PluginIdInputSchema)
	.output(DisablePlanSchema)
	.handle(async ({ id }, { switches, catalogue }) => ({
		alsoOff: [...dependentsOff(catalogue, await switches.switches(), id)],
	}));

export const setEnabled = command()
	.public()
	.input(SetEnabledInputSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, enabled }, { switches, catalogue, invalidate }) => {
		const entry = catalogue.find((one) => one.id === id);

		if (entry === undefined) {
			deny(`${id} is not a built-in plugin`);
		}

		const kept = await switches.switches();
		const targets = enabled
			? [id, ...requirementsOn(catalogue, kept, id)]
			: [id, ...dependentsOff(catalogue, kept, id)];
		const refused = catalogue.find((one) => one.alwaysOn && !enabled && targets.includes(one.id));

		if (refused !== undefined) {
			deny(`${refused.id} is always on and cannot be turned off`);
		}

		const changing = targets.filter((target) => {
			const found = catalogue.find((one) => one.id === target);
			return found !== undefined && isOn(found, kept) !== enabled;
		});

		if (changing.length === 0) {
			console.info(`[widgetarium] plugin ${id} kept ${enabled ? "on" : "off"} (already so)`);
			return;
		}

		const reason = `plugins ${changing.join(", ")} ${enabled ? "off → on" : "on → off"} (chosen in settings)`;
		await switches.change(Object.fromEntries(changing.map((target) => [target, enabled])), reason);
		invalidate(all);
		invalidate(disablePlan);
		console.info(`[widgetarium] ${reason}`);
	});
