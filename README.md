# dsc-plugin-template

[简体中文] | [English](README.en-US.md)

dsc 插件开发模板:用 TypeScript 写源码,用 esbuild 打包成单个浏览器 ESM 文件。构建同时产出运行时元数据,可选地为 `plugin.js` 产出作者签名,产物可以直接在 DeepSeek-Chat-Enhanced 中从地址安装。

## 模板给你什么

- 一份能跑通的最小插件:清单、激活、停用
- 一份契约类型的本地副本,脱离 DeepSeek-Chat-Enhanced 源码也有类型提示
- 一套构建流程:打包 `plugin.js`、生成并自校验 `meta.json`、写入 `MUST_PLUSH_WITH_PACKAGE` 标记
- 一条可选的作者签名链路:打开开关后用 openssl 对 `plugin.js` 生成 `.author.sig`
- 文本产物强制 LF 换行,`plugin.js` 默认行压缩

模板本身不做业务,只演示插件与宿主之间的最小交互:订阅会话切换事件、写插件日志、用宿主文案键提示一次。

## 目录结构

```text
dsc-plugin-template/
├── .env.example              # 环境变量模板,复制为 .env 后填私钥
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
├── schemas/
│   └── runtime/
│       └── meta.json         # runtime meta schema
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
| `schemas/runtime/` | 一份 JSON Schema,自校验规则与之保持一致 |
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

构建结束时脚本会打印每个产物的大小、压缩开关、签名状态,并检查 `dist/` 里没有预期之外的文件。文本产物(`meta.json`、`plugin.js`、`author_pub.pem`)按 LF 落盘,若检测到 CR 字节直接报错;`.author.sig` 是二进制签名,不参与换行检查。

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
| 合集签名 | 插件合集 | `meta.json.sig`、`plugin.js.sig` | 根 CA 签发的合集证书 `eec.pem` |

作者只负责产出 `.author.sig` 与 `author_pub.pem`。CMS 的 `*.sig` 由合集在收录时生成,作者不要自己产出,也不要把 `.author.sig` 改名成 `.sig`。

## 把产物装进 DeepSeek-Chat-Enhanced

用于在本机验证构建结果:

1. 用本机静态服务器提供 `dist/` 目录,例如 `http://localhost:8090/`。
2. 在插件面板的「从地址安装」中填入 `plugin.js` 的地址并安装;安装成功后插件自动激活,状态显示为「运行中」。
3. 打开「查看日志」可以看到 `context.log` 写入的内容,切换会话后日志会追加一条。

面向普通用户的说明见 [README.user.md](README.user.md)。

地址规则:分发给用户时使用 `https://` 地址。本机调试时 DeepSeek-Chat-Enhanced 允许 `http://localhost`、`http://127.0.0.1` 与 `http://[::1]`,其余地址必须是 `https://`。

产物改动后需要先在面板卸载再重新安装,同一地址的模块会被浏览器缓存。

部署要求:产物以 ES 模块的形式通过 `import()` 加载,浏览器对跨源模块导入强制校验 CORS。因此托管方必须返回 `Access-Control-Allow-Origin` 响应头,例如 `Access-Control-Allow-Origin: *`,否则插件产物托管在另一个源时安装会失败。把产物与页面放在同一域名下同源部署,则不需要该响应头。

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
| `contributions` | 否 | 订阅的贡献点,可选值为 `session:changed` |

改清单时的注意事项:

- `id` 全局唯一,重复安装会被拒绝。
- `version` 是插件版本,与 `package.json` 中的版本无关。
- `capabilities` 只写能力表内的名字,未知或重复的能力会让安装被拒绝。
- 契约以 DeepSeek-Chat-Enhanced 源码为准;`src/types.ts` 只覆盖模板用到的字段,缺的字段请查源码。

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

`net:fetch` 仅内置插件可申请,第三方插件在清单里写它会被拒绝。

模板默认申请 `events:session` 与 `notify` 两项能力,只订阅 `session:changed` 一个贡献点。

## 发布

- 交付 `dist/` 整个目录,不要只交付 `plugin.js`:`meta.json` 是市场识别插件的依据,`MUST_PLUSH_WITH_PACKAGE` 表明该目录必须随包分发。
- 目录结构、`meta.json` 的字段名与 `.author.sig` 的命名都不要改动,市场与合集按约定解析。
- 需要作者签名时,连同 `plugin.js.author.sig` 与 `author_pub.pem` 一起交付,并把公钥交给插件合集放到 `plugins/<作者>/author_pub.pem`。
- 产物托管在支持 `https` 的静态站点或 CDN 上,保持地址稳定;地址失效会让已安装插件显示为「启动失败」。
- 发布前在浏览器控制台执行一次 `import('https://你的地址/plugin.js')`,确认没有语法错误与缺失依赖。
- `dist/` 已被 `.gitignore` 忽略,需要交付产物时在 Release 中附带。
- 插件运行在用户浏览器中,可以接触 API Key 与当前会话内容,分发时必须提示用户只安装信任来源的插件。
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

先确认产物地址本身可访问:在新标签页直接打开该地址,应当返回脚本内容而不是 404、错误页或登录跳转。再确认 CORS:产物按 ES 模块通过 `import()` 加载,跨源托管必须返回 `Access-Control-Allow-Origin`;缺少该响应头时浏览器会在控制台报 CORS 错误并中断安装。把产物与页面放在同一域名下同源部署可以避开这一限制。

## 许可证

[Apache-2.0](LICENSE)。
