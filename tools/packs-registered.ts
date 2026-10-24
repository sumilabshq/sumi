import { registerPacks } from "../packages/shared/core/src/engine/packs.ts";
import { corePack } from "../packages/shared/packs/core/src/index.ts";
import { gitPack } from "../packages/shared/packs/git/src/index.ts";
import { obsidianPack } from "../packages/shared/packs/obsidian/src/index.ts";
import { statsPack } from "../packages/shared/packs/stats/src/index.ts";
import { cataloguePack } from "../packages/shared/packs/catalogue/src/index.ts";

registerPacks(corePack, obsidianPack, statsPack, gitPack, cataloguePack);
