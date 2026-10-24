export { checkDiscovered, checkProject } from "./check-project.js";
export { discoverProject, type ProjectMap } from "./discover-project.js";
export {
	CONFIG_SCHEMA_URL,
	HANDBOOK_FOLDER,
	SYSTEM_DOCS_FOLDER,
	VENDOR_FOLDER,
	engineDependenciesOf,
	filled,
	layProject,
	packageNameOf,
	projectFilesOf,
	systemFilesOf,
	systemSeedOf,
	unknownSystemSaying,
	withAppName,
	type ProjectToLay,
} from "./lay-project.js";
export { ProjectSeedSchema, type DesignSystemSeed, type EnginePackage, type ProjectSeed } from "./project-seed.js";
export { nodeProjectWriter, type NodeFileWriter, type ProjectWriter } from "./project-writer.js";
export {
	DEFAULT_DESIGN_SYSTEM,
	DESIGN_SYSTEM_SLUG,
	PROJECT_CONFIG_FILE,
	ProjectConfigSchema,
	defaultAliasesOf,
	projectConfigJsonSchema,
	readProjectConfig,
	type ProjectAliases,
	type ProjectApp,
	type ProjectConfig,
	type ProjectConfigReading,
	type ProjectDesign,
	type ProjectPaths,
} from "./project-config.js";
export type { ProjectEntry, ProjectRoute } from "./project-entry.js";
export { formatFindings, type ProjectFinding } from "./project-finding.js";
export {
	EMPTY_LISTING,
	PROJECT_ROOT,
	baseNameOf,
	joinProjectPath,
	relativePathOf,
	type ProjectFiles,
} from "./project-files.js";
export { nodeProjectFiles, type NodeDirent, type NodeEntryKind, type NodeFileSystem } from "./project-files-node.js";
export { KIT_HELPER_FOLDERS, isKitItem } from "./project-kit.js";
export { tsconfigPathsOf, viteAliasesOf, type ResolvedAlias } from "./project-aliases.js";
export { matchProjectRoute, type RouteMatch, type RoutePattern } from "./project-route-match.js";
export { LAYOUT_FILE, ROUTE_FILE, routePathOf } from "./project-routes.js";
