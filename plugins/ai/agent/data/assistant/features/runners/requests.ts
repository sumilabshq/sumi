import { PerCall, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { claudeOptionsChanged, setupChanged } from "../../gateways/chat-parts/chat-parts.events.js";
import { inChat } from "../../gateways/chat-parts/in-chat.js";
import { OPTIONS_NOT_HERE } from "../../gateways/claude-options/none.gateway.js";
import { chooseOptions, holdProvider } from "../../shared/lib/chat-drafts.js";
import { ChatKeySchema } from "../../shared/schema/chat-key.schema.js";
import {
	MetersShownSchema,
	ModelAskedSchema,
	OptionAskedSchema,
	OptionsShownSchema,
	RunnersShownSchema,
} from "../../shared/schema/runner.schema.js";
import {
	CLAUDE_CODE_RUNNER_ID,
	chosenModelOf,
	claudeAskedOf,
	claudeModelOf,
	metersShownOf,
	optionsShownOf,
	refuseModel,
	refuseOption,
	runnersShownOf,
} from "./lib/runner-choices.js";

export const getRunners = query()
	.public()
	.input(ChatKeySchema)
	.output(RunnersShownSchema)
	.handle(
		inChat(async (_input, { assistantSetup, claudeOptions, runners }) =>
			runnersShownOf(await assistantSetup.setup(), runners.runners(), claudeOptions.claudeOptions()),
		),
	);

export const getOptions = query()
	.public()
	.input(ChatKeySchema)
	.output(OptionsShownSchema)
	.handle(
		inChat(async (_input, { assistantSetup, claudeOptions, runners }) => {
			const claude = claudeOptions.claudeOptions();
			const model = chosenModelOf(await assistantSetup.setup(), runners.runners(), claude);
			return optionsShownOf(model, claude);
		}),
	);

export const getMeters = query()
	.public()
	.input(ChatKeySchema)
	.output(MetersShownSchema)
	.handle(
		inChat(async (_input, { assistantSetup, claudeOptions, runners }) =>
			metersShownOf(await assistantSetup.setup(), runners.runners(), claudeOptions.claudeOptions()),
		),
	);

export const chooseModel = command()
	.public()
	.input(ModelAskedSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(async ({ runner, model }, { assistantSetup, claudeOptions, chatDrafts, runners, invalidate }) => {
			const refusal = refuseModel(runners.runners(), runner, model);

			if (refusal !== null) {
				return refuse(refusal);
			}

			invalidate(getRunners);
			invalidate(getOptions);
			invalidate(getMeters);
			const setup = await assistantSetup.setup();

			if (setup.chosen !== runner) {
				await assistantSetup.chooseProvider(runner);
				holdProvider(chatDrafts, runner);
				console.info(`[widgetarium] runner ${setup.chosen} → ${runner} (chose model ${model})`);
			}

			const claudeModel = runner === CLAUDE_CODE_RUNNER_ID ? claudeModelOf(model) : null;
			const was = claudeOptions.claudeOptions();

			if (claudeModel === null || was === null) {
				return;
			}

			chooseOptions({ claudeOptions, chatDrafts }, { ...was, model: claudeModel });
			console.info(`[widgetarium] model ${was.model} → ${claudeModel}`);
		}),
	);

export const chooseOption = command()
	.public()
	.input(OptionAskedSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(async ({ key, value }, { assistantSetup, claudeOptions, chatDrafts, runners, invalidate }) => {
			const was = claudeOptions.claudeOptions();

			if (was === null) {
				return refuse(OPTIONS_NOT_HERE);
			}

			const model = chosenModelOf(await assistantSetup.setup(), runners.runners(), was);
			const refusal = refuseOption(model, key, value);

			if (refusal !== null) {
				return refuse(refusal);
			}

			// TRADE-OFF: values live in the Claude options cell until runners own sessions
			const asked = claudeAskedOf(key, value);

			if (typeof asked === "string") {
				return refuse(asked);
			}

			invalidate(getOptions);
			chooseOptions({ claudeOptions, chatDrafts }, { ...was, ...asked });
			console.info(`[widgetarium] option ${key} → ${value}`);
		}),
	);

export const rereadRunnersForSetup = subscriber(setupChanged).handle((_input, { invalidate }) => {
	invalidate(getRunners);
	invalidate(getOptions);
	invalidate(getMeters);
});

export const rereadRunnersForOptions = subscriber(claudeOptionsChanged).handle((_input, { invalidate }) => {
	invalidate(getRunners);
	invalidate(getOptions);
	invalidate(getMeters);
});
