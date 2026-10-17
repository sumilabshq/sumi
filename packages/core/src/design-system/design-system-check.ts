import type { ProjectFiles } from "../project/project-files.js";
import { parseJson } from "../project/project-json.js";
import {
	DESIGN_SYSTEM_MANIFEST_FILE,
	DesignSystemManifestSchema,
	filesNamedBy,
	type DesignSystemManifest,
} from "./design-system-manifest.js";
import { tokenSheetFindings } from "./token-findings.js";

const LEAST_DESIGN_SECTIONS = 7;

const SECTION_HEADING = /^## \S/gm;

type ManifestReading = { readonly manifest: DesignSystemManifest } | { readonly refusal: string };

export async function checkDesignSystem(files: ProjectFiles, slug: string): Promise<string[]> {
	const reading = await readDesignSystemManifest(files);
	if ("refusal" in reading) {
		return [reading.refusal];
	}

	return [...idFindings(reading.manifest, slug), ...(await packageFindings(files, reading.manifest))];
}

async function readDesignSystemManifest(files: ProjectFiles): Promise<ManifestReading> {
	const text = await files.read(DESIGN_SYSTEM_MANIFEST_FILE);
	if (text === null) {
		return { refusal: `${DESIGN_SYSTEM_MANIFEST_FILE} is missing` };
	}

	const json = parseJson(text);
	if ("error" in json) {
		return { refusal: `${DESIGN_SYSTEM_MANIFEST_FILE} is not valid JSON: ${json.error}` };
	}

	return manifestReadingOf(json.value);
}

function manifestReadingOf(json: unknown): ManifestReading {
	const parsed = DesignSystemManifestSchema.safeParse(json);
	if (parsed.success) {
		return { manifest: parsed.data };
	}

	const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
	return { refusal: `${DESIGN_SYSTEM_MANIFEST_FILE} is refused: ${issues.join("; ")}` };
}

async function packageFindings(files: ProjectFiles, manifest: DesignSystemManifest): Promise<string[]> {
	const [missing, design, tokens] = await Promise.all([
		missingFilesOf(files, manifest),
		files.read(manifest.files.design),
		files.read(manifest.files.tokens),
	]);
	return [
		...missing,
		...designFindings(manifest.files.design, design),
		...(tokens === null ? [] : tokenSheetFindings(tokens)),
	];
}

function idFindings(manifest: DesignSystemManifest, slug: string): string[] {
	return manifest.id === slug ? [] : [`manifest id ${manifest.id} does not match its folder ${slug}`];
}

async function missingFilesOf(files: ProjectFiles, manifest: DesignSystemManifest): Promise<string[]> {
	const named = filesNamedBy(manifest);
	const present = await Promise.all(named.map((path) => files.exists(path)));
	return named
		.filter((_path, at) => present[at] !== true)
		.map((path) => `${path} is named in the manifest and missing`);
}

function designFindings(path: string, text: string | null): string[] {
	if (text === null) {
		return [];
	}

	const sections = text.match(SECTION_HEADING)?.length ?? 0;
	return sections >= LEAST_DESIGN_SECTIONS
		? []
		: [`${path} has ${sections} H2 sections, at least ${LEAST_DESIGN_SECTIONS} are needed`];
}
