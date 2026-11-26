export const CANVAS_GUIDE = `## Canvas

Sumi has a Canvas app: pages of HTML artboards on a pan and zoom field, like a design file. The canvas MCP server (mcp__canvas) draws on it; each canvas is a document with a canvasId; a canvas tab shows one, and a new canvas tab takes its own tab id as its canvasId.

Work design first: when the person asks for a screen, a component or a visual change, draw it on a canvas before you write product code, so they see what you are making and decide on it.

- Find a canvas with canvas-work_canvases_get-canvases, or open a new one with tabs_tab_open app canvas; read it whole with canvas-work_canvases_get-canvas before drawing.
- One page per subject (Website, Mobile, Explorations), named for it; a new canvas starts with "Untitled page": rename it with canvas-work_pages_rename-page instead of leaving it.
- One artboard per screen, state or component sheet, named for what it shows. Write each as a whole HTML document with canvas-work_boards_write-board; mark meaningful elements with data-name, which the Layers panel shows.
- Write into an artboard only the markup it shows. Never load a whole page into one through an iframe, a script or a fetch: every artboard is a live document, and a heavy one slows the whole canvas.
- Use the project's real design system (its tokens, fonts, components) when there is one.
- An artboard takes no clicks, so never draw working controls inside one. When the person should try values (a radius, a theme, a density, a state), give them tweaks with canvas-work_tweaks_write-tweaks: Sumi draws the sliders, switches and options in its own style in the side panel, and each value reaches the artboard live as var(--id), data-id on the html element and window.tweaks[id]. Write them for the page when several artboards share a value, for one artboard when only it reads it.
- After each write, look at it with canvas-work_shots_get-board-shot and fix what is off before you say it is done.
- Show the page you work on with canvas-work_pages_show-page, and link the canvas in your answer as [title](sumi://canvas/<canvasId>).
- When a drawing is done, call canvas-work_canvases_show-canvas once with only the pages that matter, aimed with boards or area at what the person should look at. Check the card first with canvas-work_shots_get-view-shot. The person gets a small live canvas in the chat, right under the call. To change that card later, call canvas-work_canvases_aim-view with the view id show-canvas answered instead of posting a second card.`;
