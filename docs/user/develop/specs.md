# 规范区使用指南

本仓库的 [specs/](../../specs/README.md) 与 [schemas/](../../schemas/runtime/meta.json) 是 dsc 插件运行时规范、开发规范与 JSON Schema 的唯一源头;其他仓库引用这里的版本,不复制正文。本文说明引用方式、版本锁定与校验命令;规则条文一律以 specs 为准,本文不摘录。

## 引用方式

| 规则 | 规定 |
|:---:|:---:|
| 唯一源头 | 运行时规范、开发规范、Schema 与示例只在 `dsc-plugin-template` 维护;其他仓库不另存一份正文,也不在其中就地改规则 |
| 引用方式 | 引用方只写一段占位说明(规范以本仓库为准)加在线链接,形如 `https://github.com/omds-chat/dsc-plugin-template/blob/main/specs/plugin-runtime-spec.md` |
| 不用相对路径 | 跨仓库引用一律用在线 URL。相对路径只在发出链接的仓库里成立,到了另一个仓库会指向错误位置,克隆、镜像与离线阅读都失效 |
| 本仓库内部 | 引用本仓库自身文档时才用相对路径,便于本地预览与链接检查 |
| 反向引用 | 本仓库引用其他仓库的文档同样用在线 URL,不写 `../其他仓库/...` |
| 改规则的顺序 | 先改本仓库的 specs 与 schemas,再升 `spec_version`,最后同步引用方;引用方拿到的是新版本,不需要改正文 |

## 版本锁定

- 引用方按 [`specs/spec-version.json`](../../specs/spec-version.json) 的 `spec_version` 选定版本,并在自身依赖里固定到具体标签或提交。
- 文档内的链接一律指向最新文件,不在链接 URL 里写死标签名,历史版本由每份规范末尾的「历史版本列表」导航。
- `spec-version.json` 同时登记对应的宿主版本 `dsc_core` 与两份 Schema 的仓库内路径;脚本与引用方以它定位 Schema。
- 改规范时先改规范与 Schema,再升版本号;顺序写反会让引用方拿到与规范不符的版本。

## 限制速查

宿主对插件的主要限制集中在[运行时规范](../../specs/plugin-runtime-spec.md),此处只给入口:

| 限制 | 出处 |
|:---:|:---:|
| 单个 `plugin.js` 不超过 2 MB(2097152 字节),在线安装与本地离线包共用同一上限,超出按 `package-too-large` 拒绝 | 运行时规范 1、开发规范 6 |
| 能力与各项限流、登记型名额与单次超时 | 运行时规范 4 |
| 插件数据的 64KB 额度、键名上限与 IndexedDB 分界 | 运行时规范 5.4 与 5.6 |
| 联网与外源请求规则 | 运行时规范 5.5 |
| UI 槽位白名单与资产声明块 | 运行时规范 5.10、5.7;开发规范 2.5、2.6 |

## 校验命令

```bash
node scripts/validate-specs.mjs                          # 自检 Schema、样例与本仓库 meta 数据
node scripts/validate-specs.mjs <清单文件>                # 校验单个清单
node scripts/validate-specs.mjs <meta.json> --schema meta # 校验单个运行时 meta
```

脚本零依赖、不联网;自检覆盖规范版本与 Schema 路径一致、Schema 结构可用、正例通过、反例被拒、`package.json` 派生的 meta 通过运行时 meta Schema。Schema 是静态校验,最终判定由宿主安装时给出。

## 权威与差异

- 规范以 DeepSeek-Chat-Enhanced 的 `dsc-plugin-engine` 实现为准,本仓库只做收拢与机器可校验化,不新增规则;两侧口径不一致时记录在 [specs/README.md](../../specs/README.md) 的「已知差异」。
- 唯一例外是插件联网口径:插件联网受引擎管控,由引擎暴露的接口提供联网能力,该条按产品裁定写入,不是对实现的记述,见[运行时规范](../../specs/plugin-runtime-spec.md) 5.5。
- 规范章节与上游权威文件的逐节对照见 [design/engine-mapping.md](../../docs/design/engine-mapping.md)。
