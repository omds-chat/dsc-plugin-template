# dsc-plugin-template

[简体中文](README.md) | [English]

A template for dsc plugins: source in TypeScript, bundled by esbuild into a single browser ESM file. The build also writes the runtime metadata, optionally signs `plugin.js`, and the output can be installed into DeepSeek-Chat-Enhanced by URL.

## What you get

- a minimal plugin that already runs: manifest, activate, deactivate
- a local copy of the contract types, so type hints work without the DeepSeek-Chat-Enhanced source tree
- a build that bundles `plugin.js`, generates and self-validates `meta.json`, and writes the `MUST_PLUSH_WITH_PACKAGE` marker
- an optional author signing step that writes `plugin.js.author.sig` with openssl
- LF line endings on every text output, with minification on by default
- a set of checkable specs: the runtime spec, the development spec and their JSON Schemas, referenced by other repositories by version

The template does not implement any business logic. It only shows the smallest possible interaction between a plugin and the host: subscribing to the session switch event, writing to the plugin log, and showing one notice through a host message key.

## Specs and schemas

The plugin runtime spec, the plugin development spec and their JSON Schemas live in this repository; other repositories reference this version instead of keeping their own copy:

| Content | Location |
|:---:|:---:|
| Spec area index and known differences | [specs/README.md](specs/README.md) |
| Plugin runtime spec | [specs/plugin-runtime-spec.md](specs/plugin-runtime-spec.md) |
| Plugin development spec | [specs/plugin-develop-spec.md](specs/plugin-develop-spec.md) |
| Spec version and schema paths | [specs/spec-version.json](specs/spec-version.json) |
| Manifest schema | [schemas/manifest/plugin-manifest.schema.json](schemas/manifest/plugin-manifest.schema.json) |
| Runtime meta schema | [schemas/runtime/meta.json](schemas/runtime/meta.json) |
| Reference implementation | [examples/session-digest/index.ts](examples/session-digest/index.ts) |

- The specs follow the `dsc-plugin-engine` implementation in DeepSeek-Chat-Enhanced; this repository only collects them and makes them machine-checkable, it does not add rules. Where the two disagree, [specs/README.md](specs/README.md) records it under "Known differences". The one exception is networking: plugin networking is governed by the engine and served through interfaces the engine exposes; that rule is a product decision rather than a description of the implementation, see [runtime spec](specs/plugin-runtime-spec.md) 5.5.
- A single `plugin.js` must stay within 2 MB (2097152 bytes); online installs and local offline packages share the same limit, and anything larger is rejected with `package-too-large`. Details are in [runtime spec](specs/plugin-runtime-spec.md) 1 and [development spec](specs/plugin-develop-spec.md) 6.
- Every host-imposed limit is collected in the [runtime spec](specs/plugin-runtime-spec.md): code size and how it is measured in 1, capabilities and their rate limits in 4, the 64KB plugin data quota, key-name limit and the IndexedDB boundary in 5.4 and 5.6, networking and outbound request rules in 5.5. Offline packages and URL installs share one size check, see [development spec](specs/plugin-develop-spec.md) 6.
- Consumers pick `spec_version` from `specs/spec-version.json` and pin it to a specific tag or commit in their own dependencies. Links inside the docs always point at the latest files instead of hardcoding tag names in URLs, and each spec ends with a version history section for older releases. Change the specs and the schemas first, then bump the version.
- Validation runs offline with no dependencies: `node scripts/validate-specs.mjs` for the self-check and `node scripts/validate-specs.mjs <manifest file>` for a single manifest.

## Doc ownership and cross-repository links

The plugin runtime spec, the plugin development spec, the JSON Schemas and the examples are maintained in this repository and are the single source of truth. Other repositories keep a placeholder plus an online link instead of copying the text:

| Rule | Requirement |
|:---:|:---:|
| Single source | The runtime spec, the development spec, the schemas and the examples live only in `dsc-plugin-template`; other repositories keep no second copy and add no local rules |
| How to reference | A consumer writes one placeholder line (this repository is authoritative) plus an online link, for example `https://github.com/omds-chat/dsc-plugin-template/blob/main/specs/plugin-runtime-spec.md` |
| No relative paths | Cross-repository references always use online URLs. A relative path only resolves inside the repository that emits it and breaks once it lands in another repository, including clones, mirrors and offline reading |
| Inside this repository | Use relative paths only for this repository's own documents, so local preview and link checks work |
| Referring outward | Documents here cite other repositories with online URLs too, never `../other-repo/...` |
| Order of change | Change this repository's specs and schemas first, then bump `spec_version`, then notify consumers; consumers take the new version without editing their text |

## Project layout

```text
dsc-plugin-template/
├── .env.example              # environment template: signing key and integration addresses
├── .gitattributes            # repository-wide LF
├── .gitignore
├── .npmrc
├── LICENSE
├── README.md                 # for developers, maintained by the plugin author
├── README.user.md            # for end users, maintained by the plugin author
├── README.en-US.md           # English version of README.md, kept in sync
├── build.mjs                 # build entry
├── package.json              # project metadata, the source of meta.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── examples/
│   ├── README.md             # example index
│   └── session-digest/
│       ├── index.ts          # example plugin activation and deactivation
│       └── manifest.ts       # example plugin manifest
├── schemas/
│   ├── examples/             # passing and failing schema samples
│   ├── manifest/
│   │   └── plugin-manifest.schema.json # manifest schema
│   └── runtime/
│       └── meta.json         # runtime meta schema
├── scripts/
│   └── validate-specs.mjs    # dependency-free spec validator
├── specs/
│   ├── README.md             # spec area index and known differences
│   ├── plugin-develop-spec.md # plugin development spec
│   ├── plugin-runtime-spec.md # plugin runtime spec
│   └── spec-version.json     # spec version and schema paths
├── src/
│   ├── index.ts              # activation and deactivation entry points
│   ├── manifest.ts           # runtime manifest
│   └── types.ts              # contract types
└── dist/                     # build output, ignored by .gitignore
```

| File | Role |
|:---:|:---:|
| `build.mjs` | Build entry: bundle, generate `meta.json`, self-validate, optional author signing |
| `package.json` | Project metadata and the source of `meta.json` |
| `src/index.ts` | Activation and deactivation entry points |
| `src/manifest.ts` | Runtime manifest, still exported by the output |
| `schemas/manifest/` | Manifest JSON Schema, aligned with the host manifest checks |
| `schemas/runtime/` | JSON Schema for the runtime meta; the build self-validation covers its required and format rules |
| `scripts/validate-specs.mjs` | Dependency-free validator for the schemas, samples and this repository meta |
| `specs/` | Spec area: runtime spec, development spec, version info |
| `examples/session-digest/` | Reference example plugin, checked together with the type check |
| `.env.example` | Environment template |

## Requirements

| Item | Requirement |
|:---:|:---:|
| Node.js | 18 or later |
| pnpm | 12 or later |
| OpenSSL | 3.0 or later, needed only when author signing is on |
| Output browsers | Chrome 105, Edge 105, Safari 16, Firefox 110 |

pnpm 12 does not run dependency install scripts by default; `pnpm-workspace.yaml` allows the esbuild build script through `allowBuilds`, so do not delete that file.

## Quick start

```bash
git clone https://github.com/omds-chat/dsc-plugin-template.git
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
| `pnpm run validate:specs` | Validate the spec schemas, samples and this repository meta |

`build.mjs` takes one flag, `--no-minify`, which turns esbuild minification off. The minified output is much smaller, so keep the default when distributing.

## Build output

The build clears `dist/` first, then writes:

```text
dist/
├── meta.json                  # runtime metadata, generated from package.json
├── plugin.js                  # runtime script, single-file ESM
├── plugin.js.author.sig       # detached author signature for plugin.js, only when signing is on
├── author_pub.pem             # author public key, only when signing is on, hand it to the collection
└── MUST_PLUSH_WITH_PACKAGE    # marker file, empty
```

| Output | When | Notes |
|:---:|:---:|:---:|
| `meta.json` | every build | Validated against the rules in `schemas/runtime/meta.json` right after generation; a failure stops the build |
| `plugin.js` | every build | Single-file ESM exporting `manifest` and `activate` |
| `plugin.js.author.sig` | only when signing is enabled | Detached raw-public-key signature for `plugin.js`, 64 binary bytes |
| `author_pub.pem` | only when signing is enabled | Ed25519 public key derived from the private key, handed to the collection |
| `MUST_PLUSH_WITH_PACKAGE` | every build | Empty file meaning the directory must ship with the package |

Keep the file names as they are, including the `PLUSH` spelling in `MUST_PLUSH_WITH_PACKAGE`.

At the end the build prints the size of every output, the minify switch and the signing state, and checks that `dist/` holds nothing unexpected. Those sizes are informational only: the build does not compare them with the 2 MB limit and does not fail on size, so an oversized artifact is still produced and is rejected with `package-too-large` only when the host installs it. Text outputs (`meta.json`, `plugin.js`, `author_pub.pem`) are written as LF and a CR byte stops the build; `.author.sig` files are binary signatures and are not checked for line endings.

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
  "home_page": "https://github.com/omds-chat/dsc-plugin-template",
  "repo_link": "https://github.com/omds-chat/dsc-plugin-template"
}
```

When renaming the plugin, update `name` in `package.json`: it must match `dsc-xxx` or `@scope/dsc-xxx`, otherwise `meta.json` fails validation. When bumping the version, update `version` with three numeric segments.

## Author signing

Author signing is a detached raw-public-key signature: an Ed25519 private key signs the file bytes directly, and the signature sits next to the file with an extra `.author.sig` suffix. Key export, signing and verification all run through `openssl` subprocesses, so the build depends on no JavaScript crypto library.

The author signature covers `plugin.js` only. The collection verifies `meta.json` with a three-layer hash manifest, so there is no reason to sign it as an author: the build does not produce `meta.json.author.sig`, and the collection does not accept it.

```bash
# once: create the author key pair
openssl genpkey -algorithm ed25519 -out author_secret.pem
openssl pkey -in author_secret.pem -pubout -out author_pub.pem

cp .env.example .env
# edit .env and replace YOURS with the PKCS#8 PEM of author_secret.pem, or the relative path author_secret.pem
pnpm run build
```

`build.mjs` reads `.env` from the repository root; variables already present in the environment win, so passing them on the command line also works.

| Variable | Value | Notes |
|:---:|:---:|:---:|
| `AUTHOR_SIGN_ENABLE` | `true` | Only `true` enables signing (case and surrounding spaces are ignored), anything else counts as off |
| `AUTHOR_SIGN_PRIVATE_KEY` | PKCS#8 PEM | Ed25519 private key, or a path to a key file |

When enabled, the build writes a single signature, for `plugin.js` only, equivalent to running:

```bash
openssl pkeyutl -sign -rawin -inkey author_secret.pem -in dist/plugin.js -out dist/plugin.js.author.sig
```

Signatures cover the bytes on disk, with no line-ending normalization. After signing, the build verifies every signature with the public key it derived, and any failure stops the build:

```bash
openssl pkeyutl -verify -pubin -inkey dist/author_pub.pem -rawin -in dist/plugin.js -sigfile dist/plugin.js.author.sig
```

Signing also writes `dist/author_pub.pem`, derived from the private key, so there is no need to export it by hand. With signing off, neither that file nor any `.author.sig` is written.

The key may be written on one line with literal `\n` line breaks, or as a relative path to a key file that the build reads.

### Delivering the public key

The author hands the public key to the plugin collection, which keeps it at `plugins/<author>/author_pub.pem` and uses it to verify every `.author.sig` from that author.

| Artifact | Source | Location in the collection |
|:---:|:---:|:---:|
| `author_pub.pem` | `dist/author_pub.pem` from the build | `plugins/<author>/author_pub.pem` |
| `plugin.js.author.sig` | `dist/plugin.js.author.sig` from the build | next to `plugin.js` |

The build prints one line at the end reminding the author to hand `dist/author_pub.pem` to the collection.

### Relation to collection signatures

Author signatures and collection signatures are two independent layers, and neither replaces the other:

| Signature | Signer | Artifacts | Trust anchor |
|:---:|:---:|:---:|:---:|
| Author | plugin author | `plugin.js.author.sig` | the author key at `plugins/<author>/author_pub.pem` |
| Collection | plugin collection | `plugin.js.sig`, per-layer `manifest.json.sig` | the collection certificate `eec.pem` issued by the root CA |

Authors only produce `.author.sig` and `author_pub.pem`. The CMS `*.sig` files are generated by the collection at intake, so do not produce them yourself and do not rename `.author.sig` to `.sig`.

## Installing the output into DeepSeek-Chat-Enhanced

Use this to verify a build on your machine:

1. Serve the `dist/` directory from a local static server, for example `http://localhost:8090/`.
2. Install the `plugin.js` URL through the install-from-URL field of the plugin panel; the plugin activates right after a successful install and its status shows as running.
3. Open the plugin log to see what `context.log` wrote; every session switch appends one line.

The end-user document is [README.user.md](README.user.md).

URL rules: use an `https://` URL when distributing. For local debugging DeepSeek-Chat-Enhanced accepts `http://localhost`, `http://127.0.0.1` and `http://[::1]`; every other address must use `https://`.

The install record keeps the code text of the output, and startup restores from it without fetching again; after changing the output, uninstall the plugin in the panel and install it again so the new bytes are fetched.

Deployment requirement: the host fetches the output bytes and stores them as UTF-8 text, so the host must return an `Access-Control-Allow-Origin` header, for example `Access-Control-Allow-Origin: *`; otherwise fetching is rejected and the install fails when the output is served from a different origin. The fetch sends no credentials, so `Access-Control-Allow-Credentials` is not needed. Serving the output from the same domain as the page needs no such header.

## Local integration addresses

For offline integration across repositories, create `.env` in the repository root first:

```bash
cp .env.example .env
```

| Variable | Local value | Notes |
|:---:|:---:|:---:|
| `DS_CHAT_PAGES_LINK` | `http://127.0.0.1:61117` | Chat page address |
| `DSC_INNER_PLUGIN_PAGES_LINK` | `http://127.0.0.1:61118` | Inner-plugin page address |
| `AWESOME_DSC_PLUGIN_PAGES_LINK` | `http://127.0.0.1:61119` | Plugin collection page address |

These three values are local addresses for integration only, not distribution addresses; distribution still uses `https://` as described above.

The template consumes these addresses for integration only and never writes them into artifacts: `build.mjs` does not read them, and neither the files under `dist/` nor `meta.json` contain them. `.env` is already ignored by `.gitignore` and does not enter git; `.env.example` is committed and holds example values only.

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
| `contributions` | no | Subscribed contribution points, the only value is `session:changed` |

Things to keep in mind:

- `id` is globally unique; a second plugin with the same id is rejected.
- `version` is the plugin version and is unrelated to the version in `package.json`.
- `capabilities` may only contain names from the capability table; unknown or duplicate entries make the install fail.
- The DeepSeek-Chat-Enhanced source is the authority for the contract; `src/types.ts` covers only the fields the template uses, so check the source for anything else.
- The full field and validation rules are in [specs/plugin-develop-spec.md](specs/plugin-develop-spec.md); check a manifest with `node scripts/validate-specs.mjs <manifest file>`.

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

Networking is governed by the engine: a plugin must not call global `fetch`, `XMLHttpRequest`, `WebSocket` or similar network APIs to get data; networking always goes through a network capability the host provides, currently `net:fetch` (`context.net.getText` and `context.net.postJson`). `net:fetch` is available to built-in plugins only, and a third-party manifest that requests it is rejected; a third-party plugin that needs networking gets it only if the host decides to open it. Plugins run same-origin on the page main thread, so the engine cannot technically stop a direct call to global `fetch`; this is a contract requirement rather than a sandbox, and breaking it is non-compliance that will be called out in collection review and run logs. Details are in [runtime spec](specs/plugin-runtime-spec.md) 5.5 and 6.

- Rate limits count per plugin instance over a 10 s window; per-call timeouts and the two engine-only capability ids are in [runtime spec](specs/plugin-runtime-spec.md) 4.
- The 64KB `plugins:storage` quota is the total for all keys of one plugin, not per key, and a key name holds at most 64 characters. Keep asset snapshots and caches out of it and use the browser's IndexedDB instead: it does not count against the 64KB, the host sets no per-plugin IndexedDB limit, and it is still bound by the browser's origin quota. Details are in [runtime spec](specs/plugin-runtime-spec.md) 5.4 and 5.6.
- Code size: a single `plugin.js` must stay within 2 MB (2097152 bytes), the same limit for URL installs and offline packages, see [runtime spec](specs/plugin-runtime-spec.md) 1.

The template requests `events:session` and `notify`, and subscribes to the single contribution point `session:changed`.

## Publishing

- Ship the whole `dist/` directory, not just `plugin.js`: `meta.json` is what a market reads to identify the plugin, and `MUST_PLUSH_WITH_PACKAGE` states that the directory must ship as a package.
- Do not rename the directory layout, the `meta.json` fields or the `.author.sig` files; markets and collections parse them by convention.
- When you sign as the author, ship `plugin.js.author.sig` and `author_pub.pem`, and hand the public key to the collection so it lands at `plugins/<author>/author_pub.pem`.
- Host the output on a static site or CDN that serves `https` and keep the URL stable; a dead URL affects update checks and reinstalls, while startup restores installed plugins from the code saved at install time.
- Before publishing, run `import('https://your-host/plugin.js')` once in the browser console to confirm there is no syntax error and no missing dependency.
- `dist/` is ignored by `.gitignore`; attach the output to a release when you need to ship it.
- Plugins run in the user browser and can read the visible fields of the current conversation, but not the API key, attachment originals or other plugins' data; any distribution must tell users to install only plugins from sources they trust.
- [README.user.md](README.user.md) is the end-user document; replace its placeholders with the real plugin description before publishing.

## FAQ

### The output has an extra or a missing file

The build clears `dist/` and checks the output list; only `meta.json`, `plugin.js`, `MUST_PLUSH_WITH_PACKAGE` and, when author signing is on, `plugin.js.author.sig` and `author_pub.pem` are allowed. Anything else means the source uses dynamic `import()` or pulls in an asset that needs a separate output.

### meta.json fails validation

The build validates against the rules in `schemas/runtime/meta.json` and names the failing field. Common causes are a `name` in `package.json` that does not match `dsc-xxx`, a `version` without three numeric segments, a `dsc` block missing `engines` or `repo_link`, or an `author` written as an object.

### No signature is produced

`AUTHOR_SIGN_ENABLE` accepts only `true` (case and surrounding spaces are ignored); `1`, `yes` and similar values count as off. When signing is on and `AUTHOR_SIGN_PRIVATE_KEY` is missing, is not PKCS#8 PEM, or is not an Ed25519 key, the build fails and prints the reason.

A signature that fails verification usually means a file was re-saved between signing and delivery: CRLF against LF alone is enough to break it.

### Missing manifest

The install result is `invalid-manifest` and the host shows `pluginManifestMissing`, which usually means the output does not export `manifest`. Make sure [src/index.ts](src/index.ts) keeps `export { manifest } from './manifest.js'` and that `build.mjs` still uses `src/index.ts` as the entry point.

### Incompatible version

The install result is `incompatible-version`, which means `engines` does not match the host dsc-core version. The template declares `^1.0.0`; adjust `engines` when the host major version changes.

### Install from a URL fails

First check that the output URL itself is reachable: opening it in a new tab should return the script, not a 404, an error page or a login redirect. Then check CORS: the host fetches the output bytes, so a cross-origin host must return `Access-Control-Allow-Origin`; without that header the browser reports a CORS error and the install result is `artifact-unreachable`. Serving the output from the same domain as the page avoids the restriction.

## License

[Apache-2.0](LICENSE).
