import { PublicGuard, Server, module } from "@widgetarium/framework";
import { questionsPartsOn } from "./gateways/questions-parts/questions-parts.gateway.js";
import {
	DeliverQuestionsCommand,
	IsWaitingOnPersonQuery,
	PostQuestionsCommand,
	QuestionsQuery,
	WithdrawNeededCommand,
} from "./features/agent/requests.js";
import {
	AnswerQuestionCommand,
	ChatQuestionsQuery,
	ReadyAnswersQuery,
	ReopenQuestionCommand,
	RereadQuestionsSubscriber,
	SkipQuestionsCommand,
} from "./features/dock/requests.js";

export const QuestionsModule = module("questions")
	.on(Server)
	.guard(PublicGuard)
	.subscribers(RereadQuestionsSubscriber)
	.public(ChatQuestionsQuery, QuestionsQuery, IsWaitingOnPersonQuery, ReadyAnswersQuery)
	.public(AnswerQuestionCommand, SkipQuestionsCommand, ReopenQuestionCommand)
	.public(PostQuestionsCommand, DeliverQuestionsCommand, WithdrawNeededCommand)
	.provide((facts) => questionsPartsOn(facts));
