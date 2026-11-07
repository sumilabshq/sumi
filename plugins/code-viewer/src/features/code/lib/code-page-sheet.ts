export const CODE_PAGE_CLASS = "sumi-code-page";

const PAGE = `.wg-chat-app.${CODE_PAGE_CLASS}`;

export const CODE_PAGE_SHEET = `
${PAGE} { height: 100%; overflow-y: auto; box-sizing: border-box; padding: 20px 32px 32px 40px; background: var(--sumi-plate); }
${PAGE} .wg-studio-ai-said.is-markdown .wg-studio-ai-codeblock { background: var(--sumi-sunken); }
${PAGE} .wg-studio-ai-said.is-markdown .wg-studio-ai-codeblock-tools { background: linear-gradient(90deg, transparent, var(--sumi-sunken) 24px); }
`;
