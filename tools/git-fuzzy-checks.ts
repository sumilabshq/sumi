import { fuzzyFiltered, fuzzyRankOf } from "../plugins/git/src/features/git-page/lib/fuzzy-rank.ts";
import { check, tally } from "./check-helpers.ts";

const FILES = [
	"apps/studio/package.json",
	"package-lock.json",
	"package.json",
	"packages/shared/contract/generated/places.ts",
	"plugins/git/src/plugin.ts",
	"README.md",
];

check("an empty query keeps every file in its order", fuzzyFiltered(FILES, "", (path) => path), FILES);
check("a stray dot still finds package.json", fuzzyRankOf("package.json", ".packages") !== null, true);
check(
	"fewer mistakes rank first, and a name hit beats a path hit",
	fuzzyFiltered(FILES, "package.json", (path) => path).slice(0, 2),
	["package.json", "apps/studio/package.json"],
);
check("letters in order with gaps match", fuzzyRankOf("plugins/git/src/plugin.ts", "pgplug") !== null, true);
check("a query with too many mistakes matches nothing", fuzzyRankOf("README.md", "zzzz"), null);
check("one mistake is not allowed under four characters", fuzzyRankOf("README.md", "rex"), null);

console.log(tally.failed ? `git fuzzy: ${tally.failed} check(s) failed` : "git fuzzy: all checks passed");
process.exit(tally.failed ? 1 : 0);
