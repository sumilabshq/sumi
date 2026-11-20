export const VIEW_MESSAGE_KEY = "sumiView";
export const TOKENS_STYLE_ID = "sumi-view-tokens";

function runFrame(messageKey: string, tokensStyleId: string): void {
	const SVG = "http://www.w3.org/2000/svg";
	const CHART_WIDTH = 640;
	const CHART_HEIGHT = 220;
	const CHART_FOOT = 22;
	const CHART_HEAD = 14;
	const TICK_PATH = "M2.5 6.5l2.5 2.5 4.5-6";
	const CHEVRON_PATH = "M3 4.5l3 3 3-3";

	const post = (kind: string, fields: Record<string, unknown>): void => {
		window.parent.postMessage({ [messageKey]: kind, ...fields }, "*");
	};

	const glyph = (path: string): SVGSVGElement => {
		const svg = document.createElementNS(SVG, "svg");
		svg.setAttribute("viewBox", "0 0 12 12");
		svg.setAttribute("aria-hidden", "true");
		const line = document.createElementNS(SVG, "path");
		line.setAttribute("d", path);
		svg.append(line);
		return svg;
	};

	const button = (label: string, name: string): HTMLButtonElement => {
		const made = document.createElement("button");
		made.type = "button";
		made.textContent = label;
		made.setAttribute("aria-label", name);
		return made;
	};

	const barOf = (...children: Element[]): HTMLDivElement => {
		const bar = document.createElement("div");
		bar.className = "view-bar";
		bar.append(...children);
		return bar;
	};

	const reportHeight = (): void => {
		let height = Math.ceil(document.body.getBoundingClientRect().height);
		document.querySelectorAll("dialog[open], .select-menu:not([hidden])").forEach((open) => {
			height = Math.max(height, Math.ceil(open.getBoundingClientRect().bottom + 16));
		});
		post("height", { height });
	};

	window.addEventListener("message", (event) => {
		const data: unknown = event.data;

		if (event.source !== window.parent || typeof data !== "object" || data === null) {
			return;
		}

		const css: unknown = Reflect.get(data, "css");
		const tokens = document.getElementById(tokensStyleId);

		if (Reflect.get(data, messageKey) === "tokens" && typeof css === "string" && tokens !== null) {
			tokens.textContent = css;
			requestAnimationFrame(reportHeight);
		}
	});

	document.addEventListener(
		"click",
		(event) => {
			const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
			const href = anchor?.getAttribute("href") ?? "";

			if (anchor === null || href === "" || href.startsWith("#")) {
				return;
			}

			event.preventDefault();
			post("open", {
				href,
				inNewTab: anchor.getAttribute("target") === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey,
			});
		},
		true,
	);

	document.querySelectorAll(".slides").forEach((deck) => {
		const slides = [...deck.querySelectorAll(":scope > .slide")];

		if (slides.length < 2) {
			return;
		}

		const back = button("←", "Previous");
		const next = button("→", "Next");
		const count = document.createElement("span");
		count.className = "muted num";
		deck.after(barOf(back, next, count));
		deck.classList.add("is-wired");
		let shown = 0;
		const show = (index: number): void => {
			shown = Math.min(Math.max(index, 0), slides.length - 1);
			slides.forEach((slide, at) => slide.classList.toggle("is-hidden", at !== shown));
			back.disabled = shown === 0;
			next.disabled = shown === slides.length - 1;
			count.textContent = `${shown + 1} / ${slides.length}`;
		};
		back.addEventListener("click", () => show(shown - 1));
		next.addEventListener("click", () => show(shown + 1));
		show(0);
	});

	document.querySelectorAll<HTMLElement>(".carousel").forEach((track) => {
		const back = button("←", "Back");
		const next = button("→", "Forward");
		const bar = barOf(back, next);
		track.after(bar);
		const sync = (): void => {
			bar.hidden = track.scrollWidth <= track.clientWidth + 1;
			back.disabled = track.scrollLeft <= 0;
			next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
		};
		back.addEventListener("click", () =>
			track.scrollBy({
				left: -track.clientWidth,
				behavior: "smooth",
			}),
		);
		next.addEventListener("click", () =>
			track.scrollBy({
				left: track.clientWidth,
				behavior: "smooth",
			}),
		);
		track.addEventListener("scroll", sync, { passive: true });
		new ResizeObserver(sync).observe(track);
	});

	document.querySelectorAll(".tabs").forEach((tabs) => {
		const buttons = [...tabs.querySelectorAll<HTMLButtonElement>(":scope > .tab-list > button")];
		const panels = [...tabs.querySelectorAll<HTMLElement>(":scope > .tab-panel")];
		const show = (index: number): void => {
			buttons.forEach((tab, at) => {
				tab.setAttribute("aria-selected", String(at === index));
				tab.tabIndex = at === index ? 0 : -1;
			});
			panels.forEach((panel, at) => {
				panel.hidden = at !== index;
			});
			requestAnimationFrame(reportHeight);
		};
		tabs.querySelector(":scope > .tab-list")?.setAttribute("role", "tablist");
		panels.forEach((panel) => panel.setAttribute("role", "tabpanel"));
		buttons.forEach((tab, at) => {
			tab.type = "button";
			tab.setAttribute("role", "tab");
			tab.addEventListener("click", () => show(at));
			tab.addEventListener("keydown", (event) => {
				const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

				if (step === 0) {
					return;
				}

				const next = (at + step + buttons.length) % buttons.length;
				show(next);
				buttons[next]?.focus();
			});
		});
		tabs.classList.add("is-wired");
		show(0);
	});

	document.querySelectorAll<HTMLButtonElement>("[data-opens]").forEach((opener) => {
		const dialog = document.getElementById(opener.dataset.opens ?? "");

		if (!(dialog instanceof HTMLDialogElement)) {
			return;
		}

		if (dialog.querySelector(".dialog-close") === null) {
			const close = button("×", "Close");
			close.className = "dialog-close";
			close.addEventListener("click", () => dialog.close());
			dialog.prepend(close);
		}

		opener.addEventListener("click", () => {
			dialog.showModal();
			requestAnimationFrame(reportHeight);
		});
		dialog.addEventListener("close", () => requestAnimationFrame(reportHeight));
		dialog.addEventListener("click", (event) => {
			if (event.target === dialog) {
				dialog.close();
			}
		});
	});

	document.querySelectorAll("select").forEach((select) => {
		const holder = document.createElement("div");
		holder.className = "select";
		const opener = document.createElement("button");
		opener.type = "button";
		opener.className = "select-button";
		const picked = document.createElement("span");
		opener.append(picked, glyph(CHEVRON_PATH));
		const menu = document.createElement("div");
		menu.className = "select-menu";
		menu.setAttribute("role", "listbox");
		menu.hidden = true;
		const rows = [...select.options].map((option) => {
			const row = document.createElement("div");
			row.className = "select-option";
			row.setAttribute("role", "option");
			const text = document.createElement("span");
			text.textContent = option.textContent;
			row.append(text, glyph(TICK_PATH));
			row.addEventListener("click", () => {
				select.value = option.value;
				select.dispatchEvent(new Event("input", { bubbles: true }));
				select.dispatchEvent(new Event("change", { bubbles: true }));
				sync();
				toggle(false);
			});
			menu.append(row);
			return row;
		});
		const sync = (): void => {
			picked.textContent = select.selectedOptions[0]?.textContent ?? "";
			rows.forEach((row, at) => row.setAttribute("aria-selected", String(at === select.selectedIndex)));
		};
		const toggle = (open: boolean): void => {
			menu.hidden = !open;
			requestAnimationFrame(reportHeight);
		};
		opener.addEventListener("click", () => toggle(menu.hidden === true));
		document.addEventListener("click", (event) => {
			if (!holder.contains(event.target instanceof Node ? event.target : null)) {
				toggle(false);
			}
		});
		select.addEventListener("change", sync);
		select.after(holder);
		holder.append(opener, menu);
		sync();
	});

	const numberOf = (text: string): number => {
		const bare = text.replace(/[\s%]/g, "");
		return Number(bare.includes(".") ? bare.replace(/,/g, "") : bare.replace(",", "."));
	};

	const svgPart = (name: string, attributes: Record<string, string | number>): SVGElement => {
		const part = document.createElementNS(SVG, name);
		Object.entries(attributes).forEach(([key, value]) => part.setAttribute(key, String(value)));
		return part;
	};

	const label = (text: string, x: number, y: number, anchor: string): SVGElement => {
		const said = svgPart("text", {
			x,
			y,
			"text-anchor": anchor,
		});
		said.textContent = text;
		return said;
	};

	document.querySelectorAll<HTMLTableElement>("table.chart").forEach((table) => {
		const series = [...table.querySelectorAll("thead th")].slice(1).map((cell) => cell.textContent?.trim() ?? "");
		const rows = [...table.querySelectorAll("tbody tr")].map((row) => {
			const cells = [...row.children];
			return {
				name: cells[0]?.textContent?.trim() ?? "",
				values: cells.slice(1).map((cell) => numberOf(cell.textContent ?? "")),
			};
		});
		const top = Math.max(0, ...rows.flatMap(({ values }) => values.filter(Number.isFinite)));

		if (rows.length === 0 || series.length === 0 || top === 0) {
			return;
		}

		const plotHeight = CHART_HEIGHT - CHART_FOOT - CHART_HEAD;
		const yOf = (value: number): number => CHART_HEAD + plotHeight - (value / top) * plotHeight;
		const svg = svgPart("svg", {
			viewBox: `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`,
			role: "img",
		});
		const slot = CHART_WIDTH / rows.length;
		svg.append(
			svgPart("line", {
				class: "chart-axis",
				x1: 0,
				x2: CHART_WIDTH,
				y1: yOf(0),
				y2: yOf(0),
			}),
			label(String(top), 0, CHART_HEAD - 4, "start"),
		);
		rows.forEach(({ name }, at) => svg.append(label(name, slot * at + slot / 2, CHART_HEIGHT - 6, "middle")));

		if (table.dataset.kind === "line") {
			series.forEach((serie, index) => {
				const group = svgPart("g", { class: `series-${(index % 5) + 1}` });
				const points = rows.map(({ values }, at) => `${slot * at + slot / 2},${yOf(values[index] ?? 0)}`);
				group.append(svgPart("polyline", { class: "line", points: points.join(" ") }));
				rows.forEach(({ name, values }, at) => {
					const dot = svgPart("circle", {
						class: "dot",
						cx: slot * at + slot / 2,
						cy: yOf(values[index] ?? 0),
						r: 3,
					});
					const title = svgPart("title", {});
					title.textContent = `${serie} ${name}: ${values[index] ?? 0}`;
					dot.append(title);
					group.append(dot);
				});
				svg.append(group);
			});
		}

		if (table.dataset.kind !== "line") {
			const barWidth = Math.min(32, (slot * 0.7) / series.length);
			rows.forEach(({ name, values }, at) => {
				const start = slot * at + (slot - barWidth * series.length) / 2;
				values.forEach((value, index) => {
					const bar = svgPart("rect", {
						class: `bar series-${(index % 5) + 1}`,
						x: start + barWidth * index,
						y: yOf(value),
						width: Math.max(1, barWidth - 2),
						height: Math.max(0, yOf(0) - yOf(value)),
					});
					const title = svgPart("title", {});
					title.textContent = `${series[index] ?? ""} ${name}: ${value}`;
					bar.append(title);
					svg.append(bar);
				});
			});
		}

		const view = document.createElement("div");
		view.className = "chart-view";
		view.append(svg);

		if (series.length > 1) {
			const legend = document.createElement("div");
			legend.className = "chart-legend";
			series.forEach((serie, index) => {
				const key = document.createElement("span");
				key.className = `series-${(index % 5) + 1}`;
				key.append(document.createElement("i"), serie);
				legend.append(key);
			});
			view.append(legend);
		}

		table.before(view);
		table.classList.add("is-drawn");
	});

	const drawMeter = (meter: HTMLElement): void => {
		const total = Math.min(20, Math.max(0, Number(meter.dataset.total)));
		const done = Math.min(total, Math.max(0, Number(meter.dataset.done)));
		meter.setAttribute("role", "img");
		meter.setAttribute("aria-label", `${done} / ${total}`);
		meter.replaceChildren(
			...Array.from({ length: total }, (_unused, at) => {
				const square = document.createElement("i");
				square.className = at < done ? "is-done" : "";
				return square;
			}),
		);
	};

	const headOf = (list: Element): Element | null => {
		let before = list.previousElementSibling;

		while (before !== null && !before.classList.contains("section-head")) {
			before = before.previousElementSibling;
		}

		return before;
	};

	document.querySelectorAll(".checklist").forEach((list) => {
		const items = [...list.querySelectorAll(":scope > li")];
		const head = headOf(list);
		const counted = (): void => {
			const done = String(items.filter((item) => item.classList.contains("done")).length);
			const meter = head?.querySelector<HTMLElement>(".meter");
			const count = head?.querySelector(".count");

			if (meter !== undefined && meter !== null) {
				meter.dataset.done = done;
				drawMeter(meter);
			}

			if (count !== undefined && count !== null) {
				count.textContent = (count.textContent ?? "").replace(/\d+/, done);
			}
		};
		items.forEach((item) => {
			item.addEventListener("click", (event) => {
				if (!(event.target instanceof Element && event.target.closest("a, button"))) {
					item.classList.toggle("done");
					counted();
				}
			});
		});
		list.addEventListener("counted", counted);
	});

	document.querySelectorAll<HTMLElement>("ol.choices").forEach((choices) => {
		const answers = [...choices.querySelectorAll<HTMLElement>(":scope > li")];
		answers.forEach((answer) => {
			answer.addEventListener("click", () => {
				if (choices.classList.contains("is-answered")) {
					return;
				}

				choices.classList.add("is-answered");
				answer.classList.add("picked");
				const right = answer.hasAttribute("data-correct");
				const said = answer.querySelector(":scope > span") ?? answer.appendChild(document.createElement("span"));
				said.textContent = right ? (choices.dataset.right ?? "Correct") : (choices.dataset.wrong ?? "Not quite");
				said.className = right ? "success" : "error";

				if (!right) {
					const correct = answers.find((one) => one.hasAttribute("data-correct"));
					const shown = correct?.querySelector(":scope > span") ?? correct?.appendChild(document.createElement("span"));

					if (shown !== undefined) {
						shown.textContent = choices.dataset.right ?? "Correct";
						shown.className = "success";
					}
				}

				choices.parentElement?.querySelectorAll<HTMLElement>("[data-after-answer]").forEach((after) => {
					after.hidden = false;
				});
				requestAnimationFrame(reportHeight);
			});
		});
	});

	document.querySelectorAll<HTMLElement>("[data-walk]").forEach((list) => {
		const items = [...list.querySelectorAll<HTMLElement>(":scope > li")];

		if (items.length < 2) {
			return;
		}

		const start = button(list.dataset.walk === "" || list.dataset.walk === undefined ? "Step by step" : list.dataset.walk, "Step by step");
		start.className = "walk-start";
		const back = button("←", "Previous step");
		const next = button("→", "Next step");
		const count = document.createElement("span");
		count.className = "muted num";
		const leave = button("All steps", "Show all steps");
		const bar = barOf(back, next, count, leave);
		bar.hidden = true;
		list.before(start);
		list.after(bar);
		let current = 0;
		const show = (index: number): void => {
			current = Math.min(Math.max(index, 0), items.length - 1);
			items.forEach((item, at) => item.classList.toggle("is-current", at === current));
			back.disabled = current === 0;
			next.textContent = current === items.length - 1 ? "Done" : "→";
			count.textContent = `${current + 1} / ${items.length}`;
		};
		const walk = (walking: boolean): void => {
			list.classList.toggle("is-walking", walking);
			start.hidden = walking;
			bar.hidden = !walking;
			show(walking ? Math.max(0, items.findIndex((item) => !item.classList.contains("done"))) : 0);
			requestAnimationFrame(reportHeight);
		};
		start.addEventListener("click", () => walk(true));
		leave.addEventListener("click", () => walk(false));
		back.addEventListener("click", () => show(current - 1));
		next.addEventListener("click", () => {
			if (list.classList.contains("checklist")) {
				items[current]?.classList.add("done");
				list.dispatchEvent(new Event("counted"));
			}

			if (current === items.length - 1) {
				walk(false);
				return;
			}

			show(current + 1);
		});
	});

	document.querySelectorAll<HTMLElement>(".meter").forEach(drawMeter);
	new ResizeObserver(reportHeight).observe(document.body);
	window.addEventListener("load", reportHeight);
	reportHeight();
}

export const FRAME_RUNTIME = `(${runFrame.toString()})(${JSON.stringify(VIEW_MESSAGE_KEY)}, ${JSON.stringify(TOKENS_STYLE_ID)});`;
