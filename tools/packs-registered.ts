import { registerPacks } from "../packages/shared/core/src/engine/packs.ts";
import { corePack } from "../packages/shared/packs/core/src/index.ts";
import { cataloguePack } from "../packages/shared/packs/catalogue/src/index.ts";

registerPacks(corePack, cataloguePack);
