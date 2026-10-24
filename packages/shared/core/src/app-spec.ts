import { z } from "zod";
import { BODY_NAMES } from "./layout-bodies.js";
import { ROOT } from "./paths.js";

export const SPEC_FOLDER = `${ROOT}/apps`;
export const SPEC_FILE = "spec.md";
export const BUILD_STAGES = ["data", "design", "catalogue", "widgets", "pages"] as const;

export type BuildStage = (typeof BUILD_STAGES)[number];

export const RECORD_VERBS = ["create", "update", "remove"] as const;

export type RecordVerb = (typeof RECORD_VERBS)[number];

const RECORDS_MISSING =
	"list every kind of record the app keeps, each as { name, can: [create, update, remove] } holding the verbs it allows — the card shows Add, Edit and Delete for each";
const RESEARCH_MISSING =
	"name the products you looked at before writing this spec, each as { product, takes, url } — what that product does that this app should do too, and its site";

export function specPathOf(app: string): string {
	return `${SPEC_FOLDER}/${app}/${SPEC_FILE}`;
}

export function isBuildStage(said: unknown): said is BuildStage {
	return BUILD_STAGES.some((stage) => stage === said);
}

export function keptFeaturesOf(spec: AppSpec): AppSpec["features"] {
	return spec.features.filter((feature) => feature.kept);
}

export function specSummaryOf(spec: AppSpec): string {
	const kept = keptFeaturesOf(spec);
	return [
		`${spec.app} — ${spec.job}`,
		`${kept.length} of ${spec.features.length} features kept, ${spec.pages.length} pages, ${spec.checks.length} checks`,
		...spec.features.map((feature) => `  ${feature.kept ? "[x]" : "[ ]"} ${feature.title}`),
		...spec.records.map(
			(record) =>
				`  ${record.name}: ${RECORD_VERBS.map((verb) => `${record.can.includes(verb) ? "" : "no "}${verb}`).join(", ")}`,
		),
	].join("\n");
}

const FeatureSchema = z.object({
	title: z.string().trim().min(1),
	says: z.string().trim().min(1),
	kept: z.boolean().default(true),
	mark: z.enum(["new", "changed", "suggested"]).optional(),
	widget: z.string().trim().min(1).optional(),
	page: z.string().trim().min(1).optional(),
	actions: z.array(z.enum(["create", "update", "remove"])),
});

const ResearchSchema = z.object({
	product: z.string().trim().min(1),
	takes: z.string().trim().min(1),
	url: z.url({ error: "url: the product's site, or the page you read about it, so the person can open it" }),
	kept: z.boolean().default(true),
});

const RecordSchema = z.object({
	name: z.string().trim().min(1),
	can: z.array(z.enum(RECORD_VERBS)),
});

const ChoiceSchema = z
	.object({
		name: z.string().trim().min(1),
		picked: z.string().trim().min(1),
		options: z.array(z.string().trim().min(1)).min(2),
	})
	.refine((choice) => choice.options.includes(choice.picked), {
		message: "picked must be one of options",
		path: ["picked"],
	});

const PageSchema = z.object({
	name: z.string().trim().min(1),
	says: z.string().trim().min(1),
	body: z.string().refine((said) => BODY_NAMES.includes(said), { message: `body is one of ${BODY_NAMES.join(", ")}` }),
	note: z.string().trim().min(1).optional(),
});

const uniqueBy =
	<Row>(keyOf: (row: Row) => string) =>
	(rows: readonly Row[]): boolean =>
		new Set(rows.map(keyOf)).size === rows.length;

export const AppSpecSchema = z.object({
	app: z.string().trim().min(1),
	job: z.string().trim().min(1),
	features: z
		.array(FeatureSchema)
		.min(1)
		.max(12)
		.refine(
			uniqueBy((feature: { readonly title: string }) => feature.title),
			{ message: "every feature needs a title of its own" },
		),
	research: z.array(ResearchSchema, { error: RESEARCH_MISSING }).min(1, { message: RESEARCH_MISSING }),
	records: z
		.array(RecordSchema, { error: RECORDS_MISSING })
		.min(1, { message: RECORDS_MISSING })
		.refine(
			uniqueBy((record: { readonly name: string }) => record.name),
			{ message: "every record needs a name of its own" },
		),
	choices: z
		.array(ChoiceSchema)
		.max(3)
		.refine(
			uniqueBy((choice: { readonly name: string }) => choice.name),
			{ message: "every choice needs a name of its own" },
		)
		.default([]),
	pages: z
		.array(PageSchema)
		.min(1)
		.refine(
			uniqueBy((page: { readonly name: string }) => page.name),
			{ message: "every page needs a name of its own" },
		),
	excluded: z.array(z.string().trim().min(1)).default([]),
	checks: z.array(z.string().trim().min(1)).min(1),
});

export type AppSpec = z.infer<typeof AppSpecSchema>;

export type SpecRead =
	{ readonly spec: AppSpec; readonly refusal?: undefined } | { readonly spec?: undefined; readonly refusal: string };
