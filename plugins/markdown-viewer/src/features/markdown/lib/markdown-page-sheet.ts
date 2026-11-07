export const MARKDOWN_PAGE_CLASS = "sumi-markdown-page";

const PAGE = `.wg-chat-app.${MARKDOWN_PAGE_CLASS}`;
const SAID = `${PAGE} .wg-studio-ai-said.is-markdown`;

export const MARKDOWN_PAGE_SHEET = `
${PAGE} { height: 100%; overflow-y: auto; box-sizing: border-box; padding: 20px 32px 32px 40px; background: var(--sumi-plate); }
${SAID} { max-width: 680px; margin: 0 auto; font-size: 15px; line-height: 1.65; }
${SAID} :is(h1, h2, h3, h4, h5, h6) { font-family: var(--sumi-font-accent); font-weight: 500; color: var(--sumi-text); text-wrap: balance; }
${SAID} blockquote { border-radius: var(--sumi-r-lg); }
${SAID} h1 { margin: 0; font-size: 34px; line-height: 1.12; letter-spacing: -0.025em; }
${SAID} h2 { font-size: 22px; line-height: 1.25; letter-spacing: -0.02em; }
${SAID} :is(h3, h4, h5, h6) { font-size: 17px; line-height: 1.3; letter-spacing: -0.01em; font-weight: 600; }
${SAID} > div > * + h2 { margin-top: 30px; }
${SAID} > div > * + :is(h3, h4, h5, h6) { margin-top: 22px; }
${SAID} > div > :is(h3, h4, h5, h6) + * { margin-top: 6px; }
`;
