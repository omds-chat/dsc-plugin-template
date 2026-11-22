# 文档索引

本索引登记本仓库的每一份文档、它的职责与适用场景,并说明规范区与引用方之间的关系。仓库文档分三块:规范区(权威契约)、设计记录(面向维护者的机制与取舍)、用户文档(面向插件作者的操作步骤)。规范区是本组织 dsc 插件契约的权威来源,其他仓库引用这里的版本,不再各自维护一份。

## 主表

| 文档 | 职责一句话 | 什么时候需要读 | 主要读者 |
|:---:|:---:|:---:|:---:|
| [README.md](../README.md) | 这是什么、能拿到什么、最小可用步骤、目录结构概览 | 第一次接触本仓库 | 插件作者、模板使用者 |
| [README.en-US.md](../README.en-US.md) | 上文的英文版,逐节对应 | 读者以英文为主;核对中英两版是否同步 | 英文读者、维护者 |
| [README.user.md](../README.user.md) | 面向普通用户的说明模板,由插件作者在自己的插件仓库里填写 | 发布插件前替换占位内容 | 插件作者(填写)、终端用户(阅读) |
| [specs/README.md](../specs/README.md) | 规范区总索引、权威来源与已知差异表 | 引用规范前确认版本与权威来源;发现文档与实现不一致时 | 引用方、规范维护者 |
| [specs/plugin-runtime-spec.md](../specs/plugin-runtime-spec.md) | 插件在宿主中如何运行(产物、生命周期、能力与限流、上下文成员、安全边界、错误降级) | 写 activate 与 deactivate、申请能力、处理超时与取消时 | 插件作者、宿主实现者、评审者 |
| [specs/plugin-develop-spec.md](../specs/plugin-develop-spec.md) | 插件如何编写、签名与分发(清单、版本、运行时 meta、作者签名、分发要求) | 定义或修改清单、决定版本与依赖、准备签名与分发时 | 插件作者、发布者、评审者 |
| [specs/spec-version.json](../specs/spec-version.json) | 规范版本与 Schema 路径的唯一登记处 | 引用方锁定版本;改规范后升版本号 | 引用方、规范维护者、脚本 |
| [schemas/manifest/plugin-manifest.schema.json](../schemas/manifest/plugin-manifest.schema.json) | 插件清单的机器可校验定义 | 自动校验清单、把规则写进工具或 CI | 引用方、工具作者、插件作者 |
| [schemas/runtime/meta.json](../schemas/runtime/meta.json) | 运行时 meta.json 的机器可校验定义 | 构建自校验、合集收录校验、排查校验失败 | 插件作者、合集与市场实现者 |
| [schemas/examples/](../schemas/examples/manifest.valid.json) | Schema 的正例与反例集合 | 改 Schema 后确认正例通过、反例被拒 | 规范维护者、脚本作者 |
| [examples/README.md](../examples/README.md) | 示例插件的索引与规范要点到代码位置的对照 | 想照着一份完整实现改自己的插件 | 插件作者 |
| [docs/user/develop/specs.md](user/develop/specs.md) | 规范区使用指南:如何引用、如何校验、版本如何锁定与升级 | 要把规范引用进自己的仓库;改规范时 | 插件作者、引用方维护者 |
| [docs/user/develop/manifest.md](user/develop/manifest.md) | 清单编写指南:字段、能力、挂载点、槽位白名单、资产声明块 | 改清单、申请能力时 | 插件作者 |
| [docs/user/develop/build.md](user/develop/build.md) | 构建与联调指南:环境要求、命令、产物清单、meta.json 生成规则、装进宿主验证、本地联调地址 | 改构建、排查构建失败、本地联调时 | 插件作者、模板维护者 |
| [docs/user/develop/signing.md](user/develop/signing.md) | 作者签名指南:密钥生成、开关、公钥交付、与合集签名的分层 | 启用作者签名时 | 插件作者 |
| [docs/user/develop/distribution.md](user/develop/distribution.md) | 发布指南:交付物、托管要求、发布前自检 | 准备发布插件时 | 插件作者、发布者 |
| [docs/user/develop/faq.md](user/develop/faq.md) | 常见问题:产物、校验、签名、安装的排查路径 | 构建或安装失败时 | 插件作者 |
| [docs/design/doc-split.md](design/doc-split.md) | 文档拆分记录:各文档职责边界与迁移去向 | 想知道某段内容为什么在现在的位置 | 维护者 |
| [docs/design/engine-mapping.md](design/engine-mapping.md) | 本仓库规范与上游引擎实现的对照与冲突裁决口径 | 核对规范是否跟上实现;实现与文档分歧时 | 规范维护者、宿主开发者 |
| [build.mjs](../build.mjs) | 构建入口,把源码变成可安装产物(行为说明见 build.md) | 改打包行为、排查构建失败时 | 模板维护者、插件作者 |
| [scripts/validate-specs.mjs](../scripts/validate-specs.mjs) | 零依赖的规范区校验脚本 | 改规范或 Schema 后跑自检;校验自己的清单或 meta | 规范维护者、插件作者、CI 维护者 |
| [package.json](../package.json) | 工程信息与 meta.json 的数据来源 | 改插件名、版本、描述或作者信息 | 插件作者、模板维护者 |
| [.env.example](../.env.example) | 环境变量模板:签名开关与本地联调地址 | 启用作者签名前;跨仓库本地联调前 | 插件作者、联调者 |

## 冲突时以谁为准

按以下顺序取信,越靠前越优先:

| 层级 | 来源 | 含义 |
|:---:|:---:|:---:|
| 1 | 宿主 dsc-plugin-engine 实现 | 清单校验、能力表、限流、加载、签名与错误码的最终行为都在实现里;任何文档、Schema 与实现不一致时以实现为准 |
| 2 | 本仓库 specs 与 Schema | 对实现的文字化与机器可校验化,是引用方应当遵循的公开契约;此处与实现不一致属于待修问题,不构成新规则 |
| 3 | 脚本与样例 | scripts/validate-specs.mjs、build.mjs 与 schemas/examples 的正反例体现可执行的判定;与第 2 层冲突说明二者之一未跟上,以第 2 层为准并修脚本 |
| 4 | README 与 docs/ 的用户文档 | 说明与操作指引,面向人阅读,不承载规则;与前三层冲突时按前三层改 |

已经知道的实现与文档差异不在正文里各自表述,统一记在 [specs/README.md](../specs/README.md) 的「已知差异」表中,每行给出上游口径、实现口径与本规范的取舍;规范章节与上游权威文件的逐节对照见 [design/engine-mapping.md](design/engine-mapping.md)。引用方遇到疑问先查这两处,再查实现。

## 文档分层

| 层 | 文档 | 作用 |
|:---:|:---:|:---:|
| 权威层 | specs/plugin-runtime-spec.md、specs/plugin-develop-spec.md、specs/spec-version.json、schemas/manifest/plugin-manifest.schema.json、schemas/runtime/meta.json | 定义契约本身;其他仓库按 spec_version 选定版本,Schema 路径以 spec-version.json 的 schemas 字段为准,并在自身依赖里固定到具体标签或提交 |
| 校验层 | scripts/validate-specs.mjs、schemas/examples/、build.mjs | 让契约可执行:自检规范区、对清单与 meta 逐条判定、构建期自校验 meta.json |
| 示例层 | examples/README.md、examples/session-digest/ | 把契约落成可读、可通过类型检查的代码,不参与打包 |
| 用户层 | docs/user/** | 面向插件作者的操作步骤与规范使用指南,不新增规则,细则一律链接回 specs |
| 设计层 | docs/design/** | 面向维护者的机制说明、取舍理由与对照记录,不承载用户步骤 |
| 说明层 | README.md、README.en-US.md、README.user.md、docs/README.md | 面向人的入口、最小步骤与文档导航,不新增规则 |

规范区是权威来源:其他仓库引用运行时规范、开发规范与两份 Schema 时,以本仓库对应版本的正文与 Schema 为准,不在引用方另存一份规则;发现规范与宿主实现不符时,回到本仓库修改并留痕,而不是在引用方就地打补丁。

## 维护约定

- 改规则的顺序:先改 specs 与 schemas,再升 spec-version.json 的 spec_version 与 dsc_core,最后同步引用方;顺序写反会让引用方拿到与规范不符的版本。
- 文档内链接一律指向最新文件,不在链接 URL 里写死标签名;历史版本由每份规范末尾的「历史版本列表」导航,那里按版本倒序列出标签。
- 跨仓库引用一律用在线 URL(`https://github.com/omds-chat/...`),不写相对路径:相对路径只在发出链接的仓库里成立,到引用方仓库会指向错误位置。本仓库内部互相引用才用相对路径。
- README.md 与 README.en-US.md 同步维护,改动一节时两版一起改。
- README.user.md 是交给插件作者的模板,占位内容在生成的插件仓库里替换,本仓库不填具体业务说明。
- README 只保留门面职责:这是什么、能拿到什么、最小可用步骤、目录结构概览、许可与指向 docs 的链接;命令细节、规范条文、机制推导、FAQ 一律放 docs/,README 不收录正文摘录。
- docs/user/** 的操作文档只写步骤与指南,规则条文以 specs 为唯一出处,用链接引用;发现两处内容重复时,以 specs 为准改写 docs。
- docs/design/** 记录机制、取舍与对照,改动文档结构或规范口径时同步更新 design/doc-split.md 与 design/engine-mapping.md。
- schemas/ 不设独立 README,Schema 自身的 description 与 specs/README.md 的内容清单承担说明职责;新增 Schema 时同步更新这两处与本文主表。
- 本文只登记文档的职责与适用场景,不摘录正文;新增、重命名或删除文档时同步主表,不移动既有文档的位置。
- 规范区以中文维护,与上游文档语言一致;英文只覆盖 README。
