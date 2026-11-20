# dsc 插件规范区

本目录与 [schemas/](../schemas/runtime/meta.json) 一起收拢 dsc 插件的运行时规范、开发规范、JSON Schema 与先行实现。规范内容来自 DeepSeek-Chat-Enhanced 的 `dsc-plugin-engine` 实现与其开发文档,本仓库只做收拢、机器可校验化与示例实现,不新增规则。

## 内容

| 文件 | 内容 |
|:---:|:---:|
| [plugin-runtime-spec.md](plugin-runtime-spec.md) | 运行时规范:产物形态、导出契约、生命周期与超时、能力与限流、上下文成员、安全边界、错误降级 |
| [plugin-develop-spec.md](plugin-develop-spec.md) | 开发规范:清单字段与校验、版本与依赖、运行时 meta、作者签名与公钥位置、分发要求 |
| [spec-version.json](spec-version.json) | 规范版本与 Schema 路径,供其他仓库引用时锁定 |
| [../schemas/manifest/plugin-manifest.schema.json](../schemas/manifest/plugin-manifest.schema.json) | 清单 Schema |
| [../schemas/runtime/meta.json](../schemas/runtime/meta.json) | 运行时 meta Schema |
| [../schemas/examples/manifest.valid.json](../schemas/examples/manifest.valid.json) | Schema 的通过样例与反例 |
| [../examples/session-digest/index.ts](../examples/session-digest/index.ts) | 先行代码实现:清单导出、激活与停用、能力申请 |
| [../scripts/validate-specs.mjs](../scripts/validate-specs.mjs) | 零依赖校验脚本 |

## 权威来源与引用约定

- 权威来源是 `dsc-plugin-engine` 的实现:清单校验、能力表、限流、加载与签名都以实现为准;实现与文档不一致时以实现为准,并在「已知差异」里保留两侧口径。
- 其他仓库引用本规范时,按 `spec_version` 选定版本,并在自身依赖里固定到具体标签或提交;文档内的链接一律指向最新文件,不在链接 URL 里写死标签名,历史版本由每份规范末尾的「历史版本列表」导航。Schema 路径以 [spec-version.json](spec-version.json) 的 `schemas` 字段为准。
- 上游实现变更后,先改本目录的规范与 Schema,再升 `spec_version`,最后同步引用方;`dsc_core` 字段记录对应的宿主版本。

## 校验

```bash
node scripts/validate-specs.mjs                          # 自检 Schema、样例与本仓库 meta 数据
node scripts/validate-specs.mjs <清单文件>                # 校验单个清单
node scripts/validate-specs.mjs <meta.json> --schema meta # 校验单个运行时 meta
```

脚本只用 Node 内置模块,不联网、不安装依赖。自检覆盖:规范版本与 Schema 路径一致、Schema 结构可用、正例通过、反例被拒绝、`package.json` 派生的 meta 通过运行时 meta Schema。若磁盘上存在构建产出的 `meta.json`,也会一并校验。

## 已知差异

以下差异来自上游文档、Schema 与实现的对照,本规范按实现取舍并在此留痕,不修改上游文档。本表只保留当前仍然成立的条目:已经收敛的差异直接删除,不留历史,每行的「本规范取舍」都对应正文里的具体章节。

| 主题 | 上游文档口径 | 实现口径 | 本规范取舍 |
|:---:|:---:|:---:|:---:|
| 体积上限的记述来源 | 上游产物规范的备注仍写模板 specs 按旧上限记述、本仓库已提升到 2 MB,并留了发布前人工复核 | 实现、运行时规范与开发规范统一为 2 MB(2097152 字节),宿主提示文案由字节常量派生 | 按 2 MB 统一记述,该备注待上游更新 |
| 离线包预检里体积检查的位置 | 引擎说明与用户指南的预检表把「`plugin.js` 不超过 2 MB」列在 `meta.json` 解析与 UTF-8 检查之后 | 取到 `plugin.js` 后立即比对体积,早于 `meta.json` 解码与解析;体积与清单同时不合规时报 `package-too-large` | 按实现排序,写进 [开发规范](plugin-develop-spec.md) 6.2 |
| `meta.json` 的 UTF-8 要求 | 预检表只写「可解析」「`name`、`version`、`author` 非空」「版本为三段数字」 | 先按严格 UTF-8 解码,非法字节序列按 `invalid-meta` 拒绝,不会进入字段校验 | 写进 [开发规范](plugin-develop-spec.md) 4 与 6.2 的 `invalid-meta` 口径 |
| `meta.json` 的 `description` 形态 | 运行时 meta Schema 与[开发规范](plugin-develop-spec.md) 4 要求 `description` 为双语对象,至少含 `zh-CN` 或 `en-US` 一项 | 引擎接受字符串形式的 `description`,两种语言按同一内容处理;字段缺失也不拒绝,按空串处理 | Schema 与引擎分开写:Schema 从严,引擎的最小校验单独列出 |
| 版本范围的写法 | 运行时 meta Schema 把 `dependencies.dsc` 描述为 semver range,`>=1.0.0 <2.0.0` 这类组合范围也能通过 Schema | 清单 `engines` 与离线包的 `dependencies.dsc` 都只接受单段比较表达式;组合范围在离线包预检阶段按 `invalid-meta` 拒绝,清单侧的 `engines` 才按 `incompatible-version` 拒绝 | 两个字段分别说明,并提示 `dependencies.dsc` 也要写成单段表达式 |
| 带 `=` 前缀的精确版本 | 版本范围只写「支持 `^`、`~`、`>=`、`<=` 与精确版本」,未提等号前缀 | 范围规则接受 `=1.0.0`,与 `1.0.0` 等价,按三段数字比较 | [开发规范](plugin-develop-spec.md) 3 补上 `=` |

## 语言

规范正文以中文维护,与上游文档语言一致;仓库根目录的 `README.md` 与 `README.en-US.md` 保持中英两版同步。

## 历史版本列表

本文档只维护最新版本,历史版本由本节的链接负责导航。

本节为占位:仓库当前还没有发布标签,首个版本发布后在此按版本倒序列出,每个条目指向该版本标签下的本文档。
