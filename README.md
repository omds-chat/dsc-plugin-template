# dsc-plugin-template

[简体中文] | [English](README.en-US.md)

dsc 插件开发模板:用 TypeScript 写源码,用 esbuild 打包成单个浏览器 ESM 文件。构建同时产出运行时元数据,可选地为 `plugin.js` 产出作者签名,产物可以直接在 DeepSeek-Chat-Enhanced 中从地址安装。

## 模板给你什么

- 一份能跑通的最小插件:清单、激活、停用
- 一份契约类型的本地副本,脱离 DeepSeek-Chat-Enhanced 源码也有类型提示
- 一套构建流程:打包 `plugin.js`、生成并自校验 `meta.json`、写入 `MUST_PLUSH_WITH_PACKAGE` 标记
- 一条可选的作者签名链路:打开开关后用 openssl 对 `plugin.js` 生成 `.author.sig`
- 文本产物强制 LF 换行,`plugin.js` 默认行压缩
- 一套可校验的规范区:运行时规范、开发规范与 JSON Schema,其他仓库按版本引用

模板本身不做业务,只演示插件与宿主之间的最小交互:订阅会话切换事件、写插件日志、用宿主文案键提示一次。

## 规范与 Schema

插件运行时规范、插件开发规范与配套 JSON Schema 在本仓库维护,其他仓库引用这里的版本,不再各自维护一份:

| 内容 | 位置 |
|:---:|:---:|
| 规范区索引与已知差异 | [specs/README.md](specs/README.md) |
| 插件运行时规范 | [specs/plugin-runtime-spec.md](specs/plugin-runtime-spec.md) |
| 插件开发规范 | [specs/plugin-develop-spec.md](specs/plugin-develop-spec.md) |
| 规范版本与 Schema 路径 | [specs/spec-version.json](specs/spec-version.json) |
| 清单 Schema | [schemas/manifest/plugin-manifest.schema.json](schemas/manifest/plugin-manifest.schema.json) |
| 运行时 meta Schema | [schemas/runtime/meta.json](schemas/runtime/meta.json) |
| 先行代码实现 | [examples/session-digest/index.ts](examples/session-digest/index.ts) |

- 规范以 DeepSeek-Chat-Enhanced 的 `dsc-plugin-engine` 实现为准,本仓库只做收拢与机器可校验化,不新增规则;两侧口径不一致时记录在 [specs/README.md](specs/README.md) 的「已知差异」。唯一例外是插件联网口径:插件联网受引擎管控,由引擎暴露的接口提供联网能力,该条按产品裁定写入,不是对实现的记述,见[运行时规范](specs/plugin-runtime-spec.md) 5.5。
- 单个 `plugin.js` 不超过 2 MB(2097152 字节),在线安装与本地离线包共用同一上限,超出按 `package-too-large` 拒绝,细则见 [运行时规范](specs/plugin-runtime-spec.md) 1 与 [开发规范](specs/plugin-develop-spec.md) 6。
- 宿主对插件的各项限制集中在 [运行时规范](specs/plugin-runtime-spec.md):代码文本上限与计量口径见 1,能力与各项限流见 4,插件数据的 64KB 额度、键名上限与 IndexedDB 分界见 5.4 与 5.6,联网与外源请求的规则见 5.5;离线包与地址分发共用同一套体积判定,见 [开发规范](specs/plugin-develop-spec.md) 6。
- 引用方按 `specs/spec-version.json` 的 `spec_version` 选定版本,并在自身依赖里固定到具体标签或提交;文档内的链接一律指向最新文件,不在链接 URL 里写死标签名,历史版本由每份规范末尾的「历史版本列表」导航。改规范时先改规范与 Schema,再升版本号。
- 校验命令:`node scripts/validate-specs.mjs`(自检),`node scripts/validate-specs.mjs <清单文件>`(校验单个清单),不联网、不安装依赖。

## 文档归属与跨仓库链接

插件运行时规范、插件开发规范、JSON Schema 与示例由本仓库维护,是唯一源头。其他仓库引用时只保留占位说明与在线链接,不复制规范正文:

| 规则 | 规定 |
|:---:|:---:|
| 唯一源头 | 运行时规范、开发规范、Schema 与示例只在 `dsc-plugin-template` 维护;其他仓库不另存一份正文,也不在其中就地改规则 |
| 引用方式 | 引用方只写一段占位说明(规范以本仓库为准)加在线链接,形如 `https://github.com/omds-chat/dsc-plugin-template/blob/main/specs/plugin-runtime-spec.md` |
| 不用相对路径 | 跨仓库引用一律用在线 URL。相对路径只在发出链接的仓库里成立,到了另一个仓库会指向错误位置,克隆、镜像与离线阅读都失效 |
| 本仓库内部 | 引用本仓库自身文档时才用相对路径,便于本地预览与链接检查 |
| 反向引用 | 本仓库引用其他仓库的文档同样用在线 URL,不写 `../其他仓库/...` |
| 改规则的顺序 | 先改本仓库的 specs 与 schemas,再升 `spec_version`,最后同步引用方;引用方拿到的是新版本,不需要改正文 |

## 目录结构

```text
dsc-plugin-template/
├── .env.example              # 环境变量模板:作者签名与本地联调地址
├── .gitattributes            # 全仓库统一 LF
├── .gitignore
├── .npmrc
├── LICENSE
├── README.md                 # 面向开发者,由插件作者维护
├── README.user.md            # 面向普通用户,由插件作者维护
├── README.en-US.md           # 英文版,与 README.md 同步维护
├── build.mjs                 # 构建入口
├── package.json              # 工程信息,meta.json 的数据来源
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── examples/
│   ├── README.md             # 示例索引
│   └── session-digest/
│       ├── index.ts          # 示例插件的激活与停用
│       └── manifest.ts       # 示例插件的清单
├── schemas/
│   ├── examples/             # Schema 的正例与反例
│   ├── manifest/
│   │   └── plugin-manifest.schema.json # 清单 schema
│   └── runtime/
│       └── meta.json         # runtime meta schema
├── scripts/
│   └── validate-specs.mjs    # 零依赖规范校验脚本
├── specs/
│   ├── README.md             # 规范区索引与已知差异
│   ├── plugin-develop-spec.md # 插件开发规范
│   ├── plugin-runtime-spec.md # 插件运行时规范
│   └── spec-version.json     # 规范版本与 Schema 路径
├── src/
│   ├── index.ts              # 激活与停用入口
│   ├── manifest.ts           # 运行时清单
│   └── types.ts              # 契约类型
└── dist/                     # 构建产物,已被 .gitignore 忽略
```

| 文件 | 作用 |
|:---:|:---:|
| `build.mjs` | 构建入口:打包、生成 `meta.json`、自校验、可选作者签名 |
| `package.json` | 工程信息与 `meta.json` 的数据来源 |
| `src/index.ts` | 激活与停用入口 |
| `src/manifest.ts` | 插件运行时清单,产物继续导出 |
| `schemas/manifest/` | 清单 JSON Schema,与宿主的清单校验规则对齐 |
| `schemas/runtime/` | 运行时 meta 的 JSON Schema,构建自校验覆盖其中的必填与格式规则 |
| `scripts/validate-specs.mjs` | 零依赖校验脚本,校验 Schema、样例与本仓库 meta |
| `specs/` | 规范区:运行时规范、开发规范与版本信息 |
| `examples/session-digest/` | 先行示例插件,随类型检查一起验证 |
| `.env.example` | 环境变量模板 |

## 环境要求

| 项 | 要求 |
|:---:|:---:|
| Node.js | 18 或更高版本 |
| pnpm | 12 或更高版本 |
| OpenSSL | 3.0 或更高版本,仅启用作者签名时需要 |
| 产物目标浏览器 | Chrome 105、Edge 105、Safari 16、Firefox 110 |

pnpm 12 默认不执行依赖的安装脚本,仓库里的 `pnpm-workspace.yaml` 通过 `allowBuilds` 显式允许 esbuild 的构建脚本,请不要删除这个文件。

## 快速开始

```bash
git clone https://github.com/omds-chat/dsc-plugin-template.git
cd dsc-plugin-template
pnpm install
pnpm run type
pnpm run build
```

| 命令 | 作用 |
|:---:|:---:|
| `pnpm install` | 安装开发依赖 |
| `pnpm run type` | 运行 `tsc --noEmit` 做类型检查 |
| `pnpm run build` | 构建全部产物 |
| `pnpm run build -- --no-minify` | 关闭行压缩后再构建 |
| `pnpm run validate:specs` | 校验规范区的 Schema、样例与本仓库 meta 数据 |

`build.mjs` 支持 `--no-minify` 一个参数,关闭 esbuild 的行压缩。压缩后的产物体积明显更小,分发时建议保持默认压缩。

## 构建产物

构建先清空 `dist/`,再依次产出以下文件:

```text
dist/
├── meta.json                  # 运行时元数据,从 package.json 生成
├── plugin.js                  # 运行时脚本,单文件 ESM
├── plugin.js.author.sig       # plugin.js 的作者分离签名,仅在启用作者签名时产出
├── author_pub.pem             # 作者公钥,仅在启用作者签名时产出,交给合集
└── MUST_PLUSH_WITH_PACKAGE    # 标记文件,内容为空
```

| 产物 | 何时产出 | 说明 |
|:---:|:---:|:---:|
| `meta.json` | 每次构建 | 生成后立即按 `schemas/runtime/meta.json` 的规则自校验,不通过则构建失败 |
| `plugin.js` | 每次构建 | 单文件 ESM,导出 `manifest` 与 `activate` |
| `plugin.js.author.sig` | 仅启用作者签名时 | `plugin.js` 的裸公钥分离签名,64 字节二进制 |
| `author_pub.pem` | 仅启用作者签名时 | 由私钥推导出的 Ed25519 公钥,交给插件合集 |
| `MUST_PLUSH_WITH_PACKAGE` | 每次构建 | 空文件,表示该目录内容必须随包分发 |

文件名按约定原样保留,`MUST_PLUSH_WITH_PACKAGE` 的拼写不要改成 `PUSH`。

构建结束时脚本会打印每个产物的大小、压缩开关、签名状态,并检查 `dist/` 里没有预期之外的文件。打印体积只是信息,脚本不与 2 MB 上限比对,也不会因此让构建失败:超限产物照常产出,到宿主安装时才按 `package-too-large` 拒绝。文本产物(`meta.json`、`plugin.js`、`author_pub.pem`)按 LF 落盘,若检测到 CR 字节直接报错;`.author.sig` 是二进制签名,不参与换行检查。

## meta.json 生成规则

`meta.json` 由 `package.json` 生成,不手工维护。

| `meta.json` 字段 | 来源 | 必填 |
|:---:|:---:|:---:|
| `name` | `package.json` 的 `name` | 是 |
| `version` | `package.json` 的 `version` | 是 |
| `license` | `package.json` 的 `license` | 是 |
| `author` | `package.json` 的 `author`,字符串形式 | 是 |
| `description` | `dsc.description`,对象,至少含 `zh-CN` 或 `en-US` | 是 |
| `repo_link` | `dsc.repo_link` | 是 |
| `dependencies.dsc` | `dsc.engines` | 是 |
| `home_page` | `dsc.home_page`,缺省则不写 | 否 |
| `attached` | `dsc.attached`,缺省则不写 | 否 |

`package.json` 里的 `dsc` 块:

```json
"dsc": {
  "engines": "^1.0.0",
  "description": { "zh-CN": "示例插件", "en-US": "Demo plugin" },
  "home_page": "https://github.com/omds-chat/dsc-plugin-template",
  "repo_link": "https://github.com/omds-chat/dsc-plugin-template"
}
```

改插件名时同步改 `package.json` 的 `name`:它必须匹配 `dsc-xxx` 或 `@scope/dsc-xxx`,否则 `meta.json` 校验失败。改版本时同步改 `version`,只允许 `x.y.z` 三段数字。

## 作者签名

作者签名是裸公钥分离签名:Ed25519 私钥直接对文件原始字节签名,签名文件与被签名文件同名,追加 `.author.sig` 后缀。生成公钥、签名、验签全部交给 `openssl` 子进程完成,构建脚本不依赖任何 JS 密码库。

作者签名只覆盖 `plugin.js`。`meta.json` 的完整性由插件合集的三层哈希清单校验,作者不必为它签名:构建不产出 `meta.json.author.sig`,合集也不接收该文件。

```bash
# 一次性:生成作者密钥对
openssl genpkey -algorithm ed25519 -out author_secret.pem
openssl pkey -in author_secret.pem -pubout -out author_pub.pem

cp .env.example .env
# 编辑 .env,把 YOURS 换成 author_secret.pem 的 PKCS#8 PEM 内容,或写相对路径 author_secret.pem
pnpm run build
```

`build.mjs` 启动时读取仓库根目录的 `.env`,已存在的环境变量优先,因此也可以直接在命令行传入。

| 环境变量 | 取值 | 说明 |
|:---:|:---:|:---:|
| `AUTHOR_SIGN_ENABLE` | `true` | 只有 `true` 才启用作者签名(忽略大小写与首尾空格),其他取值视为关闭 |
| `AUTHOR_SIGN_PRIVATE_KEY` | PKCS#8 PEM | Ed25519 私钥内容,也接受私钥文件路径 |

启用后,构建只对 `plugin.js` 生成一条签名,等价于手工执行:

```bash
openssl pkeyutl -sign -rawin -inkey author_secret.pem -in dist/plugin.js -out dist/plugin.js.author.sig
```

签名对象是落盘后的原始字节,不做换行规范化。签名完成后,构建用推导出的公钥逐条自检,任何一条不通过都直接让构建失败:

```bash
openssl pkeyutl -verify -pubin -inkey dist/author_pub.pem -rawin -in dist/plugin.js -sigfile dist/plugin.js.author.sig
```

启用签名时同时产出 `dist/author_pub.pem`,它由私钥推导得到,不需要手工导出;未启用签名时不产出该文件,也不产出任何 `.author.sig`。

私钥可以写成一行,把换行写成字面量 `\n`,也可以只写私钥文件的相对路径,构建脚本会读取文件内容。

### 公钥交付

作者公钥由作者本人交给插件合集,合集按 `plugins/<作者>/author_pub.pem` 存放,用于校验该作者全部版本的 `.author.sig`。

| 交付物 | 来源 | 合集侧位置 |
|:---:|:---:|:---:|
| `author_pub.pem` | 构建产出的 `dist/author_pub.pem` | `plugins/<作者>/author_pub.pem` |
| `plugin.js.author.sig` | 构建产出的 `dist/plugin.js.author.sig` | 与 `plugin.js` 同目录 |

构建结束时会打印一行提示,提醒作者把 `dist/author_pub.pem` 交给合集。

### 与合集签名的关系

作者签名与合集签名是两层独立的签名,互不替代:

| 签名 | 签名者 | 产物 | 信任来源 |
|:---:|:---:|:---:|:---:|
| 作者签名 | 插件作者 | `plugin.js.author.sig` | 作者公钥 `plugins/<作者>/author_pub.pem` |
| 合集签名 | 插件合集 | `plugin.js.sig`、各层 `manifest.json.sig` | 根 CA 签发的合集证书 `eec.pem` |

作者只负责产出 `.author.sig` 与 `author_pub.pem`。CMS 的 `*.sig` 由合集在收录时生成,作者不要自己产出,也不要把 `.author.sig` 改名成 `.sig`。

## 把产物装进 DeepSeek-Chat-Enhanced

用于在本机验证构建结果:

1. 用本机静态服务器提供 `dist/` 目录,例如 `http://localhost:8090/`。
2. 在插件面板的「从地址安装」中填入 `plugin.js` 的地址并安装;安装成功后插件自动激活,状态显示为「运行中」。
3. 打开「查看日志」可以看到 `context.log` 写入的内容,切换会话后日志会追加一条。

面向普通用户的说明见 [README.user.md](README.user.md)。

地址规则:分发给用户时使用 `https://` 地址。本机调试时 DeepSeek-Chat-Enhanced 允许 `http://localhost`、`http://127.0.0.1` 与 `http://[::1]`,其余地址必须是 `https://`。

安装记录会保存产物的代码文本,启动恢复不再取件;产物改动后需要先在面板卸载再重新安装,才会重新取回新字节。

部署要求:宿主安装时用 `fetch` 取产物字节,再按 UTF-8 文本保存,因此托管方必须返回 `Access-Control-Allow-Origin` 响应头,例如 `Access-Control-Allow-Origin: *`,否则插件产物托管在另一个源时取件会被拒绝,安装失败。取件默认不携带凭证,不需要 `Access-Control-Allow-Credentials`;把产物与页面放在同一域名下同源部署,则不需要该响应头。

## 本地联调地址

跨仓库离线联调时,先在仓库根目录建一份 `.env`:

```bash
cp .env.example .env
```

| 变量 | 本机取值 | 说明 |
|:---:|:---:|:---:|
| `DS_CHAT_PAGES_LINK` | `http://127.0.0.1:61117` | 对话页面地址 |
| `DSC_INNER_PLUGIN_PAGES_LINK` | `http://127.0.0.1:61118` | 内测插件页地址 |
| `AWESOME_DSC_PLUGIN_PAGES_LINK` | `http://127.0.0.1:61119` | 插件合集页地址 |

这三个取值是本地联调用的本机地址,不是分发地址;对外分发仍按上文规则使用 `https://`。

模板仓库只消费这些地址做联调,不写入产物:`build.mjs` 不读取它们,`dist/` 下的文件与 `meta.json` 都不含这些取值。`.env` 已被 `.gitignore` 忽略,不会进 git;`.env.example` 随仓库提交,只放示例取值。

## 如何改 manifest

清单写在 [src/manifest.ts](src/manifest.ts),由 [src/index.ts](src/index.ts) 转出为具名导出,安装时以产物自带的 `manifest` 为准。

| 字段 | 必填 | 说明 |
|:---:|:---:|:---:|
| `id` | 是 | 插件标识,须匹配 `^[a-z][a-z0-9-]{2,63}$`,仓库约定以 `dsc-` 开头 |
| `name` | 是 | 展示名称,不得为空 |
| `version` | 是 | 插件自身版本,只允许三段数字,例如 `0.1.0` |
| `engines` | 否 | 兼容的 dsc-core 版本范围,支持 `^`、`~`、`>=`、`<=` 与精确版本 |
| `dependencies` | 否 | 依赖的插件 id,安装时须已存在,激活时须已激活 |
| `conflicts` | 否 | 冲突的插件 id,同时安装会被拒绝 |
| `capabilities` | 是 | 申请的能力,不得重复 |
| `mounts` | 否 | 订阅的挂载点,可选值为 `session:changed`、`chat:before-request` |

改清单时的注意事项:

- `id` 全局唯一,重复安装会被拒绝。
- `version` 是插件版本,与 `package.json` 中的版本无关。
- `capabilities` 只写能力表内的名字,未知或重复的能力会让安装被拒绝。
- `mounts` 只写挂载点表内的名字,重复声明会让安装被拒绝;未知挂载点由引擎拒绝,错误码为 `unknown-mount`。
- 契约以 DeepSeek-Chat-Enhanced 源码为准;`src/types.ts` 只覆盖模板用到的字段,缺的字段请查源码。
- 字段与校验规则的完整说明见 [specs/plugin-develop-spec.md](specs/plugin-develop-spec.md),可用 `node scripts/validate-specs.mjs <清单文件>` 校验。

## 能力清单

| 能力 | 上下文成员 | 限流 |
|:---:|:---:|:---:|
| `sessions:list` | `context.sessions.list` | 30 次 / 10 秒 |
| `sessions:read` | `context.sessions.read` | 30 次 / 10 秒 |
| `sessions:rename` | `context.sessions.rename` | 5 次 / 10 秒 |
| `events:session` | `context.events.on` | 5 次 / 10 秒 |
| `notify` | `context.ui.notify` | 10 次 / 10 秒 |
| `settings:locale` | `context.settings.locale` | 60 次 / 10 秒 |
| `plugins:storage` | `context.storage` | 100 次 / 10 秒,单插件 64KB |

联网受引擎管控:插件不得自行调用全局 `fetch`、`XMLHttpRequest`、`WebSocket` 等网络接口取数据,联网必须走宿主提供的网络能力,目前是 `net:fetch`(`context.net.getText`、`context.net.postJson`)。`net:fetch` 仅内置插件可申请,第三方插件在清单里写它会被拒绝;第三方插件需要联网时,由宿主决定是否开放。插件与宿主同源、跑在页面主线程,引擎无法在技术上阻止插件直接调用全局 `fetch`,所以这是一条契约约束而非沙箱拦截:违反属于不合规,会在收录审核与运行日志里被指出。细则见[运行时规范](specs/plugin-runtime-spec.md) 5.5 与 6。

- 限流按插件实例独立计数,窗口统一为 10 秒;异步能力的单次超时、引擎自用的两个能力标识见[运行时规范](specs/plugin-runtime-spec.md) 4。
- `plugins:storage` 的 64KB 是整个插件全部键值的合计,不按单个键计算;键名上限 64 个字符。资产快照、缓存这类大体积数据不要放进来,改存浏览器的 IndexedDB:它不占这 64KB,宿主也不设逐插件上限,但仍受浏览器源配额约束,细则见[运行时规范](specs/plugin-runtime-spec.md) 5.4 与 5.6。
- 代码体积:单个 `plugin.js` 不超过 2 MB(2097152 字节),在线安装与离线包同一上限,见[运行时规范](specs/plugin-runtime-spec.md) 1。

模板默认申请 `events:session` 与 `notify` 两项能力,只订阅 `session:changed` 一个挂载点。

## 发布

- 交付 `dist/` 整个目录,不要只交付 `plugin.js`:`meta.json` 是市场识别插件的依据,`MUST_PLUSH_WITH_PACKAGE` 表明该目录必须随包分发。
- 目录结构、`meta.json` 的字段名与 `.author.sig` 的命名都不要改动,市场与合集按约定解析。
- 需要作者签名时,连同 `plugin.js.author.sig` 与 `author_pub.pem` 一起交付,并把公钥交给插件合集放到 `plugins/<作者>/author_pub.pem`。
- 产物托管在支持 `https` 的静态站点或 CDN 上,保持地址稳定;地址失效会影响检查更新与重新安装,已安装插件的启动恢复只用安装时保存的代码。
- 发布前在浏览器控制台执行一次 `import('https://你的地址/plugin.js')`,确认没有语法错误与缺失依赖。
- `dist/` 已被 `.gitignore` 忽略,需要交付产物时在 Release 中附带。
- 插件运行在用户浏览器中,可以读取当前会话的可见字段,不能读取 API Key、附件原件与其他插件的数据;分发时必须提示用户只安装信任来源的插件。
- [README.user.md](README.user.md) 是面向普通用户的说明文档,发布前把其中的占位内容替换为实际的插件说明。

## 常见问题

### 产物多出或少了一个文件

构建脚本会清空 `dist/` 并校验产物清单,只允许 `meta.json`、`plugin.js`、`MUST_PLUSH_WITH_PACKAGE`,以及启用作者签名时的 `plugin.js.author.sig` 与 `author_pub.pem`。出现其他文件说明源码用了动态 `import()` 或引入了需要单独输出的资源。

### meta.json 校验失败

构建脚本按 `schemas/runtime/meta.json` 的规则自校验,报错会指出具体字段。常见原因是 `package.json` 的 `name` 不匹配 `dsc-xxx`、`version` 不是三段数字、`dsc` 块缺少 `engines` 或 `repo_link`,或 `author` 写成了对象。

### 签名没有产出

`AUTHOR_SIGN_ENABLE` 只认 `true`(忽略大小写与首尾空格),写成 `1`、`yes` 等取值都会视为关闭。启用后如果 `AUTHOR_SIGN_PRIVATE_KEY` 缺失、不是 PKCS#8 PEM,或不是 Ed25519 私钥,构建会直接失败并打印原因。

签名产出后验签不通过,通常是签名与交付之间的文件被重新保存过:CRLF 与 LF 的差别就足以让验签失败。

### 清单缺失

安装结果为 `invalid-manifest`,宿主提示 `pluginManifestMissing`,通常是产物没有导出 `manifest`。确认 [src/index.ts](src/index.ts) 保留了 `export { manifest } from './manifest.js'`,并且 `build.mjs` 的入口仍是 `src/index.ts`。

### 版本不兼容

安装结果为 `incompatible-version`,说明 `engines` 与宿主 dsc-core 版本不匹配。模板声明 `^1.0.0`;宿主主版本变化时按需调整 `engines`。

### 从地址安装失败

先确认产物地址本身可访问:在新标签页直接打开该地址,应当返回脚本内容而不是 404、错误页或登录跳转。再确认 CORS:宿主用 `fetch` 取产物字节,跨源托管必须返回 `Access-Control-Allow-Origin`;缺少该响应头时浏览器会在控制台报 CORS 错误,安装结果是 `artifact-unreachable`。把产物与页面放在同一域名下同源部署可以避开这一限制。

## 许可证

[Apache-2.0](LICENSE)。
