import { useEffect, useState } from "react";

export type ParseYaml = (text: string) => unknown;

let loadedParse: ParseYaml | null = null;

export function useYamlParse(): ParseYaml | null {
	const [parse, setParse] = useState<ParseYaml | null>(() => loadedParse);
	useEffect(() => {
		if (parse !== null) {
			return undefined;
		}

		let isMounted = true;
		void loadYamlParse().then((loaded) => {
			if (isMounted) {
				setParse(() => loaded);
			}
		});
		return () => {
			isMounted = false;
		};
	}, [parse]);
	return parse;
}

async function loadYamlParse(): Promise<ParseYaml> {
	const { parse } = await import("yaml");
	loadedParse = (text) => parse(text);
	return loadedParse;
}
