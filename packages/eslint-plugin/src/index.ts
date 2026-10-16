import type { ESLint, Linter } from "eslint";
import { parser } from "./parser.js";
import { buildingBlockNames } from "./rules/building-block-names.js";
import { contractImports } from "./rules/contract-imports.js";
import { featureLayout } from "./rules/feature-layout.js";
import { handlerOwnership } from "./rules/handler-ownership.js";
import { moduleDefinition } from "./rules/module-definition.js";
import { moduleImports } from "./rules/module-imports.js";
import { noChoiceStrings } from "./rules/no-choice-strings.js";
import { serverModule } from "./rules/server-module.js";

const PREFIX = "@widgetarium";

const rules = {
	"building-block-names": buildingBlockNames,
	"no-choice-strings": noChoiceStrings,
	"contract-imports": contractImports,
	"module-imports": moduleImports,
	"module-definition": moduleDefinition,
	"server-module": serverModule,
	"feature-layout": featureLayout,
	"handler-ownership": handlerOwnership,
} as const;

const SEVERITY: Readonly<Record<keyof typeof rules, Linter.RuleSeverity>> = {
	"building-block-names": "error",
	"no-choice-strings": "error",
	"contract-imports": "error",
	"module-imports": "error",
	"module-definition": "error",
	"server-module": "error",
	"feature-layout": "error",
	"handler-ownership": "warn",
};

const ruled: ESLint.Plugin = { meta: { name: "@widgetarium/eslint-plugin" }, rules };

const recommended: Linter.Config[] = [
	{
		name: "@widgetarium/recommended",
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: { parser },
		plugins: { [PREFIX]: ruled },
		rules: Object.fromEntries(Object.entries(SEVERITY).map(([id, severity]) => [`${PREFIX}/${id}`, severity])),
	},
];

const widgetarium = { ...ruled, configs: { recommended } };

export default widgetarium;
export { parser };
