# 文档拆分记录

本文记录本次文档拆分的职责边界与迁移去向,作为后续维护时「某段内容为什么在这里」的依据。裁剪原则:README 只留门面,操作细节进 docs/user/**,机制与取舍进 docs/design/**,规则条文只在 specs/。

## 职责边界

| 文档 | 拆分前承担的职责 | 拆分后只承担 |
|:---:|:---:|:---:|
| README.md / README.en-US.md | 门面、用法手册、规范条文摘录、签名手册、目录结构、FAQ 六种职责混在一起 | 这是什么、能拿到什么、最小可用步骤、目录结构概览、发布要点、指向 docs 的链接、许可 |
| docs/README.md | 索引、分层、维护约定(旧文把 README 的全文目录也登记进来) | 文档索引(每份一句话职责)、冲突时以谁为准、文档分层与维护约定 |
| docs/user/develop/** | 不存在 | 从 README 迁出的操作细节:规范区使用、清单编写、构建与联调、作者签名、发布、常见问题 |
| docs/design/** | 不存在 | 拆分记录与上游对照 |
| specs/** | 不变 | 不变;规范条文只在这里 |

## 迁移去向

| 原 README 章节 | 现在的位置 | 说明 |
|:---:|:---:|:---:|
| 规范与 Schema(引用规则表、限制条目) | [specs/README.md](../../specs/README.md)、[user/develop/specs.md](../user/develop/specs.md) | 规则表是规范区约定,迁入规范区;限制条目随规范章节收录,README 只留链接 |
| 文档归属与跨仓库链接 | [user/develop/specs.md](../user/develop/specs.md) | 与规范区约定同源,合并为一份使用指南 |
| 目录结构与文件作用表 | README 保留仓库级概览;含源码明细的完整树在 [user/develop/build.md](../user/develop/build.md) | 源码目录结构不放主 README |
| 环境要求、快速开始、构建产物、meta.json 生成规则 | [user/develop/build.md](../user/develop/build.md) | README 只留最小命令序列 |
| 作者签名(命令、环境变量、公钥交付、与合集签名的分层) | [user/develop/signing.md](../user/develop/signing.md) | 整段迁出 |
| 把产物装进宿主、本地联调地址 | [user/develop/build.md](../user/develop/build.md) | README 留三步验证;地址规则、CORS、安装记录细节随迁 |
| 如何改 manifest、能力清单 | [user/develop/manifest.md](../user/develop/manifest.md) | 规则条文以 specs 为唯一出处,指南只写步骤并链接 |
| 发布 | README 留要点;完整清单与托管要求在 [user/develop/distribution.md](../user/develop/distribution.md) | |
| 常见问题 | [user/develop/faq.md](../user/develop/faq.md) | 整段迁出 |

## README 保留内容的理由

- 「模板给你什么」与一句话简介回答「这是什么、能拿到什么」,是读者停留与否的判断依据,留在 README。
- 「快速开始」的最小命令序列(clone、install、type、build)是最小可用步骤,展开说明迁 build.md。
- 「装进宿主验证」三步是最小可用步骤的收尾,详细规则(CORS、地址合法性、安装记录)迁 build.md。
- 目录结构概览帮读者建立仓库地图,保留仓库级树;源码文件明细在 build.md。
- 发布要点四条是交付时最容易踩的约定(整目录交付、命名不改、签名材料、https 托管),保留;其余发布细节迁 distribution.md。
- 规范区与 docs 的链接表承担「指向 docs 的链接」职责,README 不再摘录规范条文。

## 维护方式

README 的每一节都是门面:改内容前先问它属于门面职责中的哪一种,不属于就迁到 docs/ 对应文档。拆分结构变化时更新本文与 [docs/README.md](../README.md) 主表。
