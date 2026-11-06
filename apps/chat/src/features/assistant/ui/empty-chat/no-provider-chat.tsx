import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/framework";
import { OpenProvidersCommand } from "@widgetarium/assistant";

const NO_PROVIDER_LEAD = "{label} is not on this machine yet.";
const NO_PROVIDER_SAID =
	"Install it, or pick a provider that is already here. Everything on the list runs locally and is free to use.";
const SET_UP = "Set up a provider";

export function NoProviderChat({ label }: { readonly label: string }): ReactElement {
	const openProviders = useCommand(OpenProvidersCommand);
	return (
		<div className="wg-studio-ai-empty">
			<Icon name="gear" size={28} />
			<p className="wg-studio-ai-empty-lead">{NO_PROVIDER_LEAD.replace("{label}", label)}</p>
			<p className="wg-studio-ai-empty-said">{NO_PROVIDER_SAID}</p>
			<Button variant="accent" size="m" onClick={() => void openProviders.run()}>
				{SET_UP}
			</Button>
		</div>
	);
}
