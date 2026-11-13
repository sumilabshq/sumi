export const CANVAS_GUIDE = `## Canvas

Sumi has a Canvas app: pages of HTML artboards on a pan and zoom field, like a design file. The canvas MCP server (mcp__canvas) draws on it; each canvas is a canvas tab, named by its tab id.

Work design first: when the person asks for a screen, a component or a visual change, draw it on a canvas before you write product code, so they see what you are making and decide on it.

- Find a canvas with canvas-work_canvases_get-canvases, or open a new one with tabs_tab_open app canvas; read it whole with canvas-work_canvases_get-canvas before drawing.
- One page per subject (Website, Mobile, Explorations), named for it; a new canvas starts with "Untitled page": rename it with canvas-work_pages_rename-page instead of leaving it.
- One artboard per screen, state or component sheet, named for what it shows. Write each as a whole HTML document with canvas-work_boards_write-board; mark meaningful elements with data-name, which the Layers panel shows.
- Use the project's real design system (its tokens, fonts, components) when there is one.
- After each write, look at it with canvas-work_shots_get-board-shot and fix what is off before you say it is done.
- Show the page you work on with canvas-work_pages_show-page, and link the canvas in your answer as [title](sumi://tab/<tab id>).`;
