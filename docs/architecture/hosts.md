# Hosts

A host is a platform an app runs on: Obsidian, the browser, desktop, mobile, a server. Hosts are part of the framework (`@widgetarium/host-*`); a project writes no host code.

| Host                                     | Gives a module                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `host-obsidian`                          | `host.is("obsidian")`, the vault, the window, the plugin's settings, the AI session                           |
| `host-web`                               | `host.is("web")`, browser storage, the URL; serves `/rpc` and webhook routes when the app has server requests |
| `host-desktop`, `host-mobile` _(future)_ | files, notifications, the window                                                                              |

A module picks implementations from the host in its `provide` ([requests.md](requests.md#modules)). Nothing else in a project asks which platform it runs on.

## The Obsidian host

1. Installs as a plugin and keeps its settings, the AI connection among them.
2. Opens a note whose front matter names `widgetarium-app` in the studio; `Open app` and `Create new app` commands.
3. Gives modules the vault, the window and the AI session.
4. Runs the AI agent's tools (`widgets.mjs`) over the vault.

## Deploy

| An app has…              | It needs                                                                    |
| ------------------------ | --------------------------------------------------------------------------- |
| no `.onServer()` request | no server; every host runs the handlers itself                              |
| one or more              | one server: the web host serves the pages, `/rpc/<name>` and webhook routes |

There is never a server per device. Desktop and mobile call the same `/rpc`.

## Env

Each module and integration declares the variables it needs and on which side; the app joins the parts it uses.

```ts skip-check
// packages/payments/stripe.env.ts
export const stripeEnv = env({
	server: {
		STRIPE_SECRET: z.string().describe("Secret key, Stripe dashboard → Developers → API keys"),
		STRIPE_WEBHOOK_SECRET: z.string(),
	},
});

// apps/<product>/env.ts
export const appEnv = env(stripeEnv, supabaseEnv, { client: { PUBLIC_API_URL: z.string().url() } });
```

```
# .env — never in git; .env.example is generated from the schemas, keys only
STRIPE_SECRET=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
PUBLIC_API_URL=https://…
```

- **The side belongs to the part that declares it.** An app joins `stripeEnv`; it cannot move a Stripe secret to the client. Only the `client` part reaches a browser bundle; a server variable reached from a client bundle is a build error.
- **Checked at start:** a missing or malformed variable stops the app with the variable's name and its `describe` text.
- **Only what runs is checked:** a test or a host that builds only some modules needs only their parts.
- **Handlers never read `process.env`**: values reach them through the module's `provide`.
- **Filled by the person, never seen by the agent.** The studio's integrations page draws a form from each part's schema and writes the values into `.env` (or the deploy target's env). The agent sees only "filled" or "missing" and sends the person to the page; it never reads a value.
- A key a person types into the Obsidian plugin's settings is their own key on their own machine, not a secret of the app.

## Other frameworks

Routing, SSR, deploy and loading `process.env` belong to the host. Widgetarium owns requests, handlers, modules and blocks. Inside Next.js it is an adapter, the way tRPC is: a route handler calls `handleRpc`, pages draw blocks, Next keeps its routing and env loading, and the env schema only validates. `host-web` stays on Vite; a `host-next` adapter is written when a project needs it.
