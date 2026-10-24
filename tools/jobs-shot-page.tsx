import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { JobSchema } from "../packages/shared/core/src/app-jobs.ts";
import type { Job } from "../packages/shared/core/src/app-jobs.ts";
import { AppProvider, app } from "../packages/shared/core/src/requests/index.ts";
import { PlannedPageRegion } from "../packages/domain/canvas/shared/ui/canvas-field/regions/planned-page-region.tsx";
import { PageRow } from "../packages/domain/canvas/features/pages/ui/pages-list/page-row.tsx";
import { JobLine } from "../packages/domain/canvas/features/jobs/ui/job-status/job-line.tsx";
import { ReferencesRegion } from "../packages/domain/canvas/shared/ui/canvas-field/regions/references-region.tsx";

const PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420'><rect width='640' height='420' fill='#f3f3f1'/></svg>")}`;
import { Group } from "../packages/domain/canvas/shared/ui/canvas-field/regions/group.tsx";

const MINUTE = 60000;
const NOW = Date.now();

const job = (fields: Partial<Job> & Pick<Job, "id" | "title" | "page" | "phase">): Job =>
	JobSchema.parse({ app: "Studio", says: "Draw it.", createdAt: NOW - 30 * MINUTE, ...fields });

const JOBS: Job[] = [
	job({
		id: "studio-design",
		title: "Design the Studio page",
		page: "Studio",
		phase: "design",
		status: "waiting",
		spent: 48210,
		startedAt: NOW - 14 * MINUTE,
		endedAt: NOW - MINUTE,
		said: "Drew Studio three ways: A leads with this week's numbers, B with the covers, C with the week's plan.",
		question: { said: "Which direction should every page follow?", options: ["A", "B", "C"] },
	}),
	job({
		id: "ideas-design",
		title: "Design the Ideas page",
		page: "Ideas",
		phase: "design",
		status: "running",
		after: ["studio-design"],
		spent: 9120,
		startedAt: NOW - 6 * MINUTE,
	}),
	job({
		id: "filming-design",
		title: "Design the Filming page",
		page: "Filming",
		phase: "design",
		status: "queued",
		after: ["ideas-design"],
	}),
	job({
		id: "studio-implement",
		title: "Build the Studio page",
		page: "Studio",
		phase: "implement",
		status: "paused",
		reason: "budget",
		spent: 120000,
		startedAt: NOW - 20 * MINUTE,
		endedAt: NOW - 2 * MINUTE,
	}),
	job({
		id: "hooks-review",
		title: "Review the Hooks page",
		page: "Hooks",
		phase: "review",
		status: "failed",
		reason: "claude exited with code 1. Usage limit reached.",
		startedAt: NOW - 9 * MINUTE,
		endedAt: NOW - 8 * MINUTE,
	}),
];

const host = document.getElementById("host");
if (!host) throw new Error("jobs shot: the page has no #host");
const pages = ["Docs", "Studio", "Ideas", "Filming", "Hooks", "References", "Components", "Jobs"];
const byId = (id: string): Job =>
	JOBS.find((one) => one.id === id) ?? JOBS[0] ?? job({ id: "x", title: "x", page: null, phase: "task" });

function isRunning(page: string): boolean {
	return JOBS.some((one) => one.page === page && one.status === "running");
}

createRoot(host).render(
	h(
		AppProvider,
		{ app: app({ modules: [] }) },
		h("div", { className: "wg-portal", style: { display: "flex", flexDirection: "column", gap: "24px" } }, [
			h(
				"div",
				{ key: "pages", style: { width: "200px" } },
				pages.map((page) =>
					h(PageRow, {
						key: page,
						row: { page, isRunning: isRunning(page), isShown: page === "Ideas" },
						onPick: () => undefined,
					}),
				),
			),
			h(
				"div",
				{
					key: "draft",
					style: {
						transform: "scale(0.5)",
						transformOrigin: "0 0",
						width: "200%",
						display: "flex",
						flexDirection: "column",
						gap: "48px",
					},
				},
				[
					h(ReferencesRegion, {
						key: "references",
						region: {
							kind: "references",
							title: "References",
							count: 1,
							references: [
								{
									key: "notion-board.png",
									title: "notion-board.png",
									badge: "app",
									sub: "Notion board of a content calendar",
									src: PICTURE,
									alt: "Notion board of a content calendar",
									callouts: [
										{
											text: "Columns by stage, a count on each",
											tone: "take",
											widget: { id: "@studio/video-board", name: "Video pipeline board" },
											at: [0.3, 0.2],
										},
										{
											text: "Status chip on every card",
											tone: "take",
											widget: { id: "@studio/video-card", name: "Video card" },
											at: [0.6, 0.5],
										},
										{
											text: "Board under a week strip became the Ideas layout",
											tone: "take",
											widget: null,
											at: [0.5, 0.1],
										},
										{
											text: "Property list on every card: too busy on a phone",
											tone: "dislike",
											widget: null,
											at: [0.7, 0.8],
										},
									],
								},
							],
						},
					}),
					h(
						Group,
						{
							key: "page",
							title: "Ideas",
							sub: "4 states",
						},
						h(JobLine, {
							job: JobSchema.parse({
								id: "ideas-review",
								app: "Studio",
								title: "Polish Ideas",
								page: "Ideas",
								phase: "review",
								says: "x",
								status: "running",
								spent: 3400,
								startedAt: NOW - 2 * MINUTE,
							}),
							isInline: true,
						}),
						h("div", {
							style: {
								width: "1280px",
								height: "320px",
								background: "var(--background-primary)",
								boxShadow: "0 0 0 1px var(--background-modifier-border)",
							},
						}),
					),
				],
			),
			h(
				"div",
				{
					key: "field",
					style: {
						transform: "scale(0.35)",
						transformOrigin: "0 0",
						width: "285%",
						display: "flex",
						flexWrap: "wrap",
						gap: "48px",
					},
				},
				[
					...["ideas-design"].map((id) =>
						h(PlannedPageRegion, {
							key: id,
							region: {
								kind: "planned",
								title: "Pages",
								page: byId(id).page ?? byId(id).title,
								width: 1280,
								height: 832,
							},
						}),
					),
				],
			),
		]),
	),
);
