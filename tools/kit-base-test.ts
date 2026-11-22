import { BASE_KIT, type BaseKitEntry } from "../packages/shared/kit/src/constants/base-kit.ts";
import { check, tally } from "./check-helpers.ts";
import { baseKitGaps, kitExportNames } from "./kit-base.ts";

const sample: readonly BaseKitEntry[] = [
	{ name: "Button", group: "actions", today: ["Button", "IconButton", "Ghost"] },
	{ name: "Stack", group: "layout", today: [] },
];

check("a base name that is exported is not missing", baseKitGaps(["Button", "Stack"], sample).missing, []);
check("a base name that is not exported is missing", baseKitGaps(["Button"], sample).missing, ["Stack"]);
check("a today name still exported is unmerged", baseKitGaps(["Button", "IconButton"], sample).unmerged, [
	"IconButton -> Button",
]);
check("the base name itself is never unmerged", baseKitGaps(["Button"], sample).unmerged, []);
check("a today name that is not exported is unknown", baseKitGaps(["Button", "IconButton"], sample).unknownToday, [
	"Ghost (in Button)",
]);

const baseNames = new Set(BASE_KIT.map((entry) => entry.name));
const foreignBaseNames = BASE_KIT.flatMap((entry) =>
	entry.today.filter((name) => name !== entry.name && baseNames.has(name)).map((name) => `${name} (in ${entry.name})`),
);

check("the base kit lists 55 components", BASE_KIT.length, 55);
check("base kit names are unique", baseNames.size, BASE_KIT.length);
check("no entry absorbs another entry's base name", foreignBaseNames, []);

const { missing, unmerged, unknownToday } = baseKitGaps(kitExportNames());

check("every name the base kit lists for today is exported", unknownToday, []);

console.log(`base kit: ${BASE_KIT.length - missing.length} of ${BASE_KIT.length} exported under their name`);
console.log(`missing: ${missing.join(", ")}`);
console.log(`unmerged: ${unmerged.join(", ")}`);

check("every base component is exported under its name", missing.length, 0);
check("nothing the base absorbs is still exported", unmerged.length, 0);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("kit base: all checks passed");
