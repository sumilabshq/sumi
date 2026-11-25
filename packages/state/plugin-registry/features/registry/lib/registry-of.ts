import type { CatalogueEntry } from "../../../shared/host/registry.host.js";
import { isOn } from "../../../shared/lib/switch-plan.js";
import type { Switches } from "../../../shared/lib/switch-plan.js";
import { PluginMetadataSchema } from "../../../shared/schema/registry.schema.js";
import type { RegistryEntry } from "../../../shared/schema/registry.schema.js";

export function entryOf(entry: CatalogueEntry, switches: Switches): RegistryEntry {
	const metadata = PluginMetadataSchema.safeParse(entry.metadata);

	if (!metadata.success) {
		console.error(`[widgetarium] plugin ${entry.id} metadata none → refused (${metadata.error.message})`);
	}

	return {
		id: entry.id,
		metadata: metadata.success ? metadata.data : null,
		requires: [...entry.requires],
		enabled: isOn(entry, switches),
		alwaysOn: entry.alwaysOn,
	};
}

export function restartNeededOf(
	catalogue: readonly CatalogueEntry[],
	switches: Switches,
	startedIds: readonly string[],
): boolean {
	return catalogue.some((entry) => isOn(entry, switches) !== startedIds.includes(entry.id));
}
