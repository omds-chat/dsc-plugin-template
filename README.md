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

## 快速开始

| 项 | 要求 |
|:---:|:---:|
| Node.js | 18 或更高版本 |
| pnpm | 12 或更高版本 |
| OpenSSL | 3.0 或更高版本,仅启用作者签名时需要 |

```bash
git clone https://github.com/omds-chat/dsc-plugin-template.git
cd dsc-plugin-template
pnpm install
pnpm run type
pnpm run build
```

构建、产物清单、`meta.json` 生成规则与本地联调见 [构建与联调指南](docs/user/develop/build.md);作者签名见 [作者签名指南](docs/user/develop/signing.md)。

## 装进宿主验证

1. 用本地静态服务器提供 `dist/` 目录。
2. 在插件面板的「从地址安装」中填入 `plugin.js` 的地址并安装;安装成功后插件自动激活。
3. 打开「查看日志」可以看到 `context.log` 写入的内容,切换会话后日志会追加一条。

`dist/` 已被 `.gitignore` 忽略;构建产物 `meta.json` 由 `package.json` 生成,不手工维护。

## 目录结构

```text
dsc-plugin-template/
├── docs/                     # 文档索引、用户指南与设计记录
├── examples/                 # 示例插件,不参与打包
├── schemas/                  # 清单与运行时 meta 的 JSON Schema,含正反例
├── scripts/                  # 零依赖规范校验脚本
├── specs/                    # 规范区:运行时规范、开发规范、版本与 Schema
├── src/                      # 插件源码:入口、清单与契约类型
├── build.mjs                 # 构建入口
├── package.json              # 工程信息,meta.json 的数据来源
└── .env.example              # 环境变量模板:作者签名与本地联调地址
```

完整目录树与逐文件说明见[构建与联调指南](docs/user/develop/build.md)的「源码结构」一节。

## 规范区

插件运行时规范、插件开发规范与配套 JSON Schema 在本仓库维护,是唯一源头;其他仓库引用这里的版本,不再各自维护一份:

| 内容 | 位置 |
|:---:|:---:|
| 文档索引 | [docs/README.md](docs/README.md) |
| 规范区索引与已知差异 | [specs/README.md](specs/README.md) |
| 插件运行时规范 | [specs/plugin-runtime-spec.md](specs/plugin-runtime-spec.md) |
| 插件开发规范 | [specs/plugin-develop-spec.md](specs/plugin-develop-spec.md) |
| 规范版本与 Schema 路径 | [specs/spec-version.json](specs/spec-version.json) |
| 清单与运行时 meta Schema | [schemas/](schemas/manifest/plugin-manifest.schema.json) |
| 先行代码实现 | [examples/session-digest/](examples/session-digest/index.ts) |

引用方式、版本锁定与校验命令见[规范区使用指南](docs/user/develop/specs.md);清单与能力的写法见[清单编写指南](docs/user/develop/manifest.md)。

## 发布

- 交付 `dist/` 整个目录,不要只交付 `plugin.js`:`meta.json` 是市场识别插件的依据。
- 目录结构与产物文件名按约定原样保留,不要改名。
- 产物托管在支持 `https` 的静态站点或 CDN 上;跨源托管必须返回 `Access-Control-Allow-Origin` 响应头。
- 分发时必须提示用户只安装信任来源的插件。

完整交付清单、离线包与发布前自检见[发布指南](docs/user/develop/distribution.md);构建或安装失败先查[常见问题](docs/user/develop/faq.md)。面向普通用户的说明模板是 [README.user.md](README.user.md)。

## 许可证

[Apache-2.0](LICENSE)。
