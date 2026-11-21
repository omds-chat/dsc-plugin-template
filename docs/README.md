# 文档索引

本索引登记本仓库的每一份文档、它的职责与适用场景,并说明规范区与引用方之间的关系。仓库文档分三块:规范区(权威契约)、工程实现与校验、示例与说明。规范区是本组织 dsc 插件契约的权威来源,其他仓库引用这里的版本,不再各自维护一份。

## 主表

| 文档 | 职责一句话 | 主要内容 | 什么时候需要读 | 主要读者 |
|:---:|:---:|:---:|:---:|:---:|
| [README.md](../README.md) | 面向插件开发者的中文总览与操作手册 | 模板能力、规范与 Schema 入口、文档归属与跨仓库链接规则、目录结构、环境要求、快速开始、构建产物、meta.json 生成规则、作者签名与公钥交付、安装与发布、常见问题 | 第一次接触本仓库;或要改清单、改构建、启用签名、交付产物时 | 插件作者、模板使用者 |
| [README.en-US.md](../README.en-US.md) | 上文的英文版,逐节对应 | 与中文版同构:模板能力、规范与 Schema、目录结构、构建、签名、安装、发布、FAQ | 读者以英文为主时;核对中英两版是否同步时 | 英文读者、维护者 |
| [README.user.md](../README.user.md) | 面向普通用户的说明模板,由插件作者在自己的插件仓库里填写 | 插件用途、安装步骤、使用方法、隐私与安全告知、反馈渠道,正文为占位内容 | 发布插件前替换占位内容时;需要确认要向用户告知哪些事项时 | 插件作者(填写)、终端用户(阅读) |
| [specs/README.md](../specs/README.md) | 规范区总索引与口径留痕处 | 规范区文件清单、权威来源与引用约定、校验命令、已知差异表(上游文档口径与实现口径的对照)、语言约定、历史版本列表 | 引用本规范前确认版本与权威来源时;发现文档与实现不一致、需要查是否已留痕时 | 引用方、规范维护者、宿主开发者 |
| [specs/plugin-runtime-spec.md](../specs/plugin-runtime-spec.md) | 插件在宿主中如何运行 | 产物形态(单文件 ESM、UTF-8、2 MB 上限、Blob 加载)、导出契约与清单优先级、生命周期与超时、能力与限流、上下文成员(可见数据范围、事件与挂载点、提示与设置、插件数据、大体积数据与 IndexedDB、联网与外源请求)、安全边界、错误与降级、校验方式 | 写 activate 与 deactivate、申请能力、处理超时与取消、判断插件能看到哪些数据时 | 插件作者、宿主实现者、评审者 |
| [specs/plugin-develop-spec.md](../specs/plugin-develop-spec.md) | 插件如何编写、签名与分发 | 开发约束、清单字段与校验规则、校验顺序与结果、清单 id 收敛、版本与依赖、运行时 meta、作者签名与公钥位置、分发要求(从地址安装、离线包、分发前自检)、用户告知、校验方式 | 定义或修改清单、决定版本与依赖、准备签名、打包与上线前自检时 | 插件作者、发布者、评审者 |
| [specs/spec-version.json](../specs/spec-version.json) | 规范版本与 Schema 路径的唯一登记处 | spec_version、对应的宿主版本 dsc_core、两份 Schema 的仓库内路径 | 引用方锁定版本时;改规范后需要升版本号时;脚本定位 Schema 时 | 引用方、规范维护者、脚本作者 |
| [schemas/manifest/plugin-manifest.schema.json](../schemas/manifest/plugin-manifest.schema.json) | 插件清单的机器可校验定义 | JSON Schema 2020-12 的清单结构:必填字段、id 与版本格式、engines 范围、capabilities 与 mounts 枚举、附加字段限制 | 需要自动校验清单时;把清单规则写进工具或 CI 时;核对字段合法性时 | 引用方、工具作者、插件作者 |
| [schemas/runtime/meta.json](../schemas/runtime/meta.json) | 运行时元数据 meta.json 的机器可校验定义 | meta.json 的字段结构:name、version、license、双语 description、author、repo_link、dependencies.dsc 等,以及各字段的格式约束 | 构建脚本自校验 meta.json 时;离线包预检与合集收录校验时;排查 meta.json 校验失败时 | 插件作者、合集与市场实现者 |
| [schemas/examples](../schemas/examples/manifest.valid.json) | Schema 的正例与反例集合 | manifest.valid、manifest.full.valid、meta.valid 三份正例;invalid/ 下逐条对应某一校验规则的反例(bad-id、bad-version、compound-engines、duplicate-capability、unknown-capability、missing-capabilities、whitespace-name、meta.bad-name、meta.bad-version、meta.missing-author、meta.extra-field) | 改 Schema 后确认正例仍通过、反例仍被拒绝时;想知道某条规则对应什么输入时 | 规范维护者、脚本作者、引用方 |
| [examples/README.md](../examples/README.md) | 示例插件的索引 | 示例与两份规范的对应关系、规范要点到代码位置的对照表、示例不参与打包的说明、改造成自己插件的步骤 | 想照着一份完整实现改自己的插件时 | 插件作者 |
| [examples/session-digest/manifest.ts](../examples/session-digest/manifest.ts) | 清单导出的参考实现 | 必填字段、engines、能力申请、挂载点声明的完整写法 | 不确定清单该怎么写时 | 插件作者 |
| [examples/session-digest/index.ts](../examples/session-digest/index.ts) | 激活与停用的参考实现 | 具名导出 manifest 与 activate、异步入口与重复激活去重、上下文成员使用、能力调用、按 error.name 判定取消与超时、插件数据读写与失败降级、宿主文案键 | 需要一份能通过类型检查的完整插件骨架时 | 插件作者 |
| [build.mjs](../build.mjs) | 构建入口,把源码变成可安装产物 | 清空 dist、esbuild 打包 plugin.js、从 package.json 生成并自校验 meta.json、写入 MUST_PLUSH_WITH_PACKAGE、可选的 openssl 作者签名与逐条验签、文本产物强制 LF、--no-minify 开关、产物清单与体积报告 | 改打包行为、改产物清单、排查构建失败或签名缺失时 | 模板维护者、插件作者 |
| [scripts/validate-specs.mjs](../scripts/validate-specs.mjs) | 零依赖的规范区校验脚本 | 自检规范版本与 Schema 路径一致、Schema 结构可用、正例通过、反例被拒、package.json 派生的 meta 通过 Schema;支持校验单个清单或单个 meta | 改规范或 Schema 后跑自检;校验自己的清单或 meta 时 | 规范维护者、插件作者、CI 维护者 |
| [package.json](../package.json) | 工程信息与 meta.json 的数据来源 | name、version、license、author、dsc 块(engines、双语 description、home_page、repo_link)与三个脚本命令 | 改插件名、版本、描述或作者信息时;新增或调整命令时 | 插件作者、模板维护者 |
| [.env.example](../.env.example) | 环境变量模板 | 作者签名开关与私钥取值;三个本地联调地址的示例取值 | 启用作者签名前;跨仓库本地联调前 | 插件作者、联调者 |

## 冲突时以谁为准

按以下顺序取信,越靠前越优先:

| 层级 | 来源 | 含义 |
|:---:|:---:|:---:|
| 1 | 宿主 dsc-plugin-engine 实现 | 清单校验、能力表、限流、加载、签名与错误码的最终行为都在实现里;任何文档、Schema 与实现不一致时以实现为准 |
| 2 | 本仓库 specs 与 Schema | 对实现的文字化与机器可校验化,是引用方应当遵循的公开契约;此处与实现不一致属于待修问题,不构成新规则 |
| 3 | 脚本与测试 | scripts/validate-specs.mjs、build.mjs 与 schemas/examples 的正反例体现可执行的判定;与第 2 层冲突说明二者之一未跟上,以第 2 层为准并修脚本 |
| 4 | README | 说明与操作指引,面向人阅读,不承载规则;与前三层冲突时按前三层改 README |

已经知道的实现与文档差异不在正文里各自表述,统一记在 [specs/README.md](../specs/README.md) 的「已知差异」表中,每行给出上游口径、实现口径与本规范的取舍。引用方遇到疑问先查该表,再查实现。

## 文档分层

| 层 | 文档 | 作用 |
|:---:|:---:|:---:|
| 权威层 | specs/plugin-runtime-spec.md、specs/plugin-develop-spec.md、specs/spec-version.json、schemas/manifest/plugin-manifest.schema.json、schemas/runtime/meta.json | 定义契约本身;其他仓库按 spec_version 选定版本,Schema 路径以 spec-version.json 的 schemas 字段为准,并在自身依赖里固定到具体标签或提交 |
| 校验层 | scripts/validate-specs.mjs、schemas/examples/、build.mjs | 让契约可执行:自检规范区、对清单与 meta 逐条判定、构建期自校验 meta.json |
| 示例层 | examples/README.md、examples/session-digest/ | 把契约落成可读、可通过类型检查的代码,不参与打包 |
| 说明层 | README.md、README.en-US.md、README.user.md、docs/README.md | 面向人的入口、操作步骤与文档导航,不新增规则 |

规范区是权威来源:其他仓库引用运行时规范、开发规范与两份 Schema 时,以本仓库对应版本的正文与 Schema 为准,不在引用方另存一份规则;发现规范与宿主实现不符时,回到本仓库修改并留痕,而不是在引用方就地打补丁。

## 维护约定

- 改规则的顺序:先改 specs 与 schemas,再升 spec-version.json 的 spec_version 与 dsc_core,最后同步引用方;顺序写反会让引用方拿到与规范不符的版本。
- 文档内链接一律指向最新文件,不在链接 URL 里写死标签名;历史版本由每份规范末尾的「历史版本列表」导航,那里按版本倒序列出标签。
- 跨仓库引用一律用在线 URL(`https://github.com/omds-chat/...`),不写相对路径:相对路径只在发出链接的仓库里成立,到引用方仓库会指向错误位置。本仓库内部互相引用才用相对路径。
- README.md 与 README.en-US.md 同步维护,改动一节时两版一起改。
- README.user.md 是交给插件作者的模板,占位内容在生成的插件仓库里替换,本仓库不填具体业务说明。
- schemas/ 不设独立 README,Schema 自身的 description 与 specs/README.md 的内容清单承担说明职责;新增 Schema 时同步更新这两处与本文主表。
- 本文只登记文档的职责与适用场景,不摘录正文;新增、重命名或删除文档时同步主表,不移动既有文档的位置。
- 不改写他人维护的文档来迁就本索引;索引跟着文档走,而不是让文档迁就索引。
- 规范区以中文维护,与上游文档语言一致;英文只覆盖 README。
