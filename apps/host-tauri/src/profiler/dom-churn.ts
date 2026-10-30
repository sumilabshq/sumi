import { Tallies } from "./tallies.js";

const BUSIEST_TARGETS_LIMIT = 6;

interface ChurnTarget {
	readonly name: string;
	readonly calls: number;
}

interface ChurnReport {
	readonly mutations: number;
	readonly batches: number;
	readonly nodes: number;
	readonly top: ChurnTarget[];
}

export class DomChurn {
	private mutations = 0;
	private batches = 0;
	private root: Element | null = null;
	private readonly targets = new Tallies();

	observe(root: Element): void {
		this.root = root;
		new MutationObserver((records) => {
			this.batches += 1;
			this.mutations += records.length;
			for (const record of records) {
				this.targets.add(`${selectorOf(record.target)} ${record.attributeName ?? record.type}`, 0);
			}
		}).observe(root, {
			subtree: true,
			childList: true,
			attributes: true,
			characterData: true,
		});
	}

	drain(): ChurnReport {
		const report = {
			mutations: this.mutations,
			batches: this.batches,
			nodes: this.root?.getElementsByTagName("*").length ?? 0,
			top: this.targets.drain(BUSIEST_TARGETS_LIMIT).map(({ name, calls }) => ({
				name,
				calls,
			})),
		};
		this.mutations = 0;
		this.batches = 0;
		return report;
	}
}

function selectorOf(target: Node): string {
	const element = target instanceof Element ? target : target.parentElement;
	if (element === null) {
		return target.nodeName;
	}

	const tag = element.tagName.toLowerCase();
	const firstClass = element.classList.item(0);
	return firstClass === null ? tag : `${tag}.${firstClass}`;
}
