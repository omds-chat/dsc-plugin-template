# dsc-plugin-template

[简体中文](README.md) | [English]

A template for dsc plugins: source in TypeScript, bundled by esbuild into a single browser ESM file. The build also writes the runtime metadata, optionally signs it, and the output can be installed into dsc by URL.

## What you get

- a minimal plugin that already runs: manifest, activate, deactivate
- a local copy of the contract types, so type hints work without the DeepSeek-Chat-Enhanced source tree
- a build that bundles `plugin.js`, generates and self-validates `meta.json`, and writes the `MUST_PLUSH_WITH_PACKAGE` marker
- an optional author signing step that signs the output when switched on
- LF line endings on every output, with minification on by default

The template does not implement any business logic. It only shows the smallest possible interaction between a plugin and the host.

## Project layout

```text
dsc-plugin-template/
├── .env.example              # environment template, copy to .env and fill in the key
├── .gitattributes            # repository-wide LF
├── .gitignore
├── .npmrc
├── LICENSE
├── README.md                 # for developers, maintained by the plugin author
├── README.user.md            # for end users, maintained by the plugin author
├── build.mjs                 # build entry
├── package.json              # project metadata, the source of meta.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── schemas/
│   └── runtime/
│       ├── meta.json         # runtime meta schema
│       └── plugin_sign.json  # plugin_sign.json schema
├── src/
│   ├── index.ts              # activation and deactivation entry points
│   ├── manifest.ts           # runtime manifest
│   └── types.ts              # contract types
└── dist/                     # build output, ignored by .gitignore
```

| File | Role |
|:---:|:---:|
| `build.mjs` | Build entry: bundle, generate `meta.json`, self-validate, optional signing |
| `package.json` | Project metadata and the source of `meta.json` |
| `src/index.ts` | Activation and deactivation entry points |
| `src/manifest.ts` | Runtime manifest, still exported by the output |
| `schemas/runtime/` | The two JSON Schemas used for validation |
| `.env.example` | Environment template |

## Requirements

| Item | Requirement |
|:---:|:---:|
| Node.js | 18 or later |
| pnpm | 12 or later |
| Output browsers | Chrome 105, Edge 105, Safari 16, Firefox 110 |

pnpm 12 does not run dependency install scripts by default; `pnpm-workspace.yaml` allows the esbuild build script through `allowBuilds`, so do not delete that file.

## Quick start

```bash
git clone https://github.com/omdsc-dev/dsc-plugin-template.git
cd dsc-plugin-template
pnpm install
pnpm run type
pnpm run build
```

| Command | Role |
|:---:|:---:|
| `pnpm install` | Install dev dependencies |
| `pnpm run type` | Run `tsc --noEmit` for a type check |
| `pnpm run build` | Build every output |
| `pnpm run build -- --no-minify` | Build without minification |

`build.mjs` takes one flag, `--no-minify`, which turns esbuild minification off. The minified output is much smaller, so keep the default when distributing.

## Build output

The build clears `dist/` first, then writes:

```text
dist/
├── meta.json                # runtime metadata, generated from package.json
├── plugin.js                # runtime script, single-file ESM
├── plugin_sign.json         # author signature, only when enabled
└── MUST_PLUSH_WITH_PACKAGE  # marker file, empty
```

| Output | When | Notes |
|:---:|:---:|:---:|
| `meta.json` | every build | Validated against `schemas/runtime/meta.json` right after generation; a failure stops the build |
| `plugin.js` | every build | Single-file ESM exporting `manifest` and `activate` |
| `plugin_sign.json` | only when signing is enabled | One signature for `meta.json` and one for `plugin.js` |
| `MUST_PLUSH_WITH_PACKAGE` | every build | Empty file meaning the directory must ship with the package |

Keep the file names as they are, including the `PLUSH` spelling in `MUST_PLUSH_WITH_PACKAGE`.

At the end the build prints the size of every output, the minify switch and the signing state, and checks that `dist/` holds nothing unexpected. Every output is written as LF; a CR byte stops the build.

## How meta.json is generated

`meta.json` is generated from `package.json` and is never edited by hand.

| `meta.json` field | Source | Required |
|:---:|:---:|:---:|
| `name` | `name` in `package.json` | yes |
| `version` | `version` in `package.json` | yes |
| `license` | `license` in `package.json` | yes |
| `author` | `author` in `package.json`, as a string | yes |
| `description` | `dsc.description`, at least `zh-CN` or `en-US` | yes |
| `repo_link` | `dsc.repo_link` | yes |
| `dependencies.dsc` | `dsc.engines` | yes |
| `home_page` | `dsc.home_page`, omitted when absent | no |
| `attached` | `dsc.attached`, omitted when absent | no |

The `dsc` block in `package.json`:

```json
"dsc": {
  "engines": "^1.0.0",
  "description": { "zh-CN": "Demo plugin", "en-US": "Demo plugin" },
  "home_page": "https://github.com/omdsc-dev/dsc-plugin-template",
  "repo_link": "https://github.com/omdsc-dev/dsc-plugin-template"
}
```

When renaming the plugin, update `name` in `package.json`: it must match `dsc-xxx` or `@scope/dsc-xxx`, otherwise `meta.json` fails validation. When bumping the version, update `version` with three numeric segments.

## Author signing

Signing uses Ed25519 with hash-then-sign: the file bytes are hashed with SHA-512 and the digest is signed, then the base64 result goes into `plugin_sign.json`.

```bash
cp .env.example .env
# edit .env and replace YOURS with a PKCS#8 PEM private key
pnpm run build
```

`build.mjs` reads `.env` from the repository root; variables already present in the environment win, so passing them on the command line also works.

| Variable | Value | Notes |
|:---:|:---:|:---:|
| `AUTHOR_SIGN_ENABLE` | `true` | Only `true` enables signing, anything else counts as off |
| `AUTHOR_SIGN_PRIVATE_KEY` | PKCS#8 PEM | The key itself, or a path to a key file |

When enabled, `plugin_sign.json` is written:

```json
{
  "sign": [
    { "value": "<base64>", "for": "meta.json", "signer": "omdsc-dev" },
    { "value": "<base64>", "for": "plugin.js", "signer": "omdsc-dev" }
  ]
}
```

`signer` comes from `author` in `package.json`. When signing is off, no `plugin_sign.json` is written and the plugin collection adds its own signature. When signing is on but the key is missing, the build fails instead of skipping silently.

The key may be written on one line with literal `\n` line breaks, or as a relative path to a key file that the build reads.

## Installing the output into DeepSeek-Chat-Enhanced

1. Serve the `dist/` directory from a local static server, for example `http://localhost:8090/`.
2. Open the plugin panel with the plugin button at the bottom of the sidebar.
3. Paste the `plugin.js` URL into the install-from-URL field, then click install.
4. The plugin activates right after a successful install, and its status shows as running.
5. Open the plugin log to see what `context.log` wrote; every session switch appends one line.

URL rules: use an `https://` URL when distributing. For local debugging DeepSeek-Chat-Enhanced accepts `http://localhost`, `http://127.0.0.1` and `http://[::1]`; every other address must use `https://`.

After changing the output, uninstall the plugin in the panel and install it again, because the browser caches the module for a given URL.

Deployment requirement: the output is loaded as an ES module through `import()`, and browsers enforce CORS on cross-origin module imports. The host must therefore return an `Access-Control-Allow-Origin` header, for example `Access-Control-Allow-Origin: *`; otherwise installing fails when the output is served from a different origin. Serving the output from the same domain as the page needs no such header.

## Editing the manifest

The manifest lives in [src/manifest.ts](src/manifest.ts) and is re-exported by [src/index.ts](src/index.ts). Installation uses the `manifest` exported by the output.

| Field | Required | Notes |
|:---:|:---:|:---:|
| `id` | yes | Plugin identifier, must match `^[a-z][a-z0-9-]{2,63}$`, the repository convention is a `dsc-` prefix |
| `name` | yes | Display name, must not be empty |
| `version` | yes | Plugin version, three numeric segments such as `0.1.0` |
| `engines` | no | Compatible dsc-core range, supports `^`, `~`, `>=`, `<=` and an exact version |
| `dependencies` | no | Required plugin ids, present at install time and active at activation time |
| `conflicts` | no | Conflicting plugin ids, installing both is rejected |
| `capabilities` | yes | Requested capabilities, no duplicates |
| `contributions` | no | Subscribed contribution points, currently only `session:changed` |

Things to keep in mind:

- `id` is globally unique; a second plugin with the same id is rejected.
- `version` is the plugin version and is unrelated to the version in `package.json`.
- `capabilities` may only contain names from the capability table; unknown or duplicate entries make the install fail.
- The organization keeps a contract reference at `.agents/dsc-plugin-contract.md`; if it disagrees with the DeepSeek-Chat-Enhanced source, the source wins.

## Capabilities

| Capability | Context member | Rate limit |
|:---:|:---:|:---:|
| `sessions:list` | `context.sessions.list` | 30 calls / 10 s |
| `sessions:read` | `context.sessions.read` | 30 calls / 10 s |
| `sessions:rename` | `context.sessions.rename` | 5 calls / 10 s |
| `events:session` | `context.events.on` | 5 calls / 10 s |
| `notify` | `context.ui.notify` | 10 calls / 10 s |
| `settings:locale` | `context.settings.locale` | 60 calls / 10 s |
| `plugins:storage` | `context.storage` | 100 calls / 10 s, 64KB per plugin |

`net:fetch` is available to built-in plugins only; a third-party manifest that requests it is rejected as an unknown capability.

The template requests `events:session` and `notify`, and subscribes to the single contribution point `session:changed`.

## Publishing

- Ship the whole `dist/` directory, not just `plugin.js`: `meta.json` is what a market reads to identify the plugin, and `MUST_PLUSH_WITH_PACKAGE` states that the directory must ship as a package.
- Do not rename the directory layout, the `meta.json` fields or `plugin_sign.json`; markets parse them by schema.
- When you sign as the author, ship `plugin_sign.json` and put the public key where the plugin collection expects it.
- Host the output on a static site or CDN that serves `https` and keep the URL stable; a dead URL shows the installed plugin as failed to start.
- Before publishing, run `import('https://your-host/plugin.js')` once in the browser console to confirm there is no syntax error and no missing dependency.
- `dist/` is ignored by `.gitignore`; attach the output to a release when you need to ship it.
- Plugins run in the user browser and can reach the API key and the current conversation, so any distribution must tell users to install only plugins from sources they trust.

## FAQ

### The output has an extra or a missing file

The build clears `dist/` and checks the output list; only `meta.json`, `plugin.js`, `MUST_PLUSH_WITH_PACKAGE` and, when signing is on, `plugin_sign.json` are allowed. Anything else means the source uses dynamic `import()` or pulls in an asset that needs a separate output.

### meta.json fails validation

The build validates against `schemas/runtime/meta.json` and names the failing field. Common causes are a `name` in `package.json` that does not match `dsc-xxx`, a `version` without three numeric segments, a `dsc` block missing `engines` or `repo_link`, or an `author` written as an object.

### No signature is produced

`AUTHOR_SIGN_ENABLE` accepts only `true`; `1`, `yes` or a quoted value counts as off. When signing is on and `AUTHOR_SIGN_PRIVATE_KEY` is missing or not an Ed25519 key, the build fails and prints the reason.

### Missing manifest

The install result is `invalid-manifest` and the host shows `pluginManifestMissing`, which usually means the output does not export `manifest`. Make sure [src/index.ts](src/index.ts) keeps `export { manifest } from './manifest.js'` and that `build.mjs` still uses `src/index.ts` as the entry point.

### Incompatible version

The install result is `incompatible-version`, which means `engines` does not match the host dsc-core version. The current host is `1.0.0` and the template uses `^1.0.0`; adjust `engines` when the host major version changes.

### Install from a URL fails

First check that the output URL itself is reachable: opening it in a new tab should return the script, not a 404, an error page or a login redirect. Then check CORS: the output is loaded as an ES module through `import()`, so a cross-origin host must return `Access-Control-Allow-Origin`; without that header the browser reports a CORS error and the install stops. Serving the output from the same domain as the page avoids the restriction.

## License

[Apache-2.0](LICENSE).
