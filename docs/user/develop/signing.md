# 作者签名指南

作者签名是裸公钥分离签名:Ed25519 私钥直接对 `plugin.js` 的原始字节签名,签名文件与被签名文件同名,追加 `.author.sig` 后缀。生成公钥、签名、验签全部交给 `openssl` 子进程完成,构建脚本不依赖任何 JS 密码库。规则条文见[插件开发规范](../../../specs/plugin-develop-spec.md) 5。

作者签名只覆盖 `plugin.js`。`meta.json` 的完整性由插件合集的三层哈希清单校验,作者不必为它签名:构建不产出 `meta.json.author.sig`,合集也不接收该文件。

## 启用签名

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

## 公钥交付

作者公钥由作者本人交给插件合集,合集按 `plugins/<作者>/author_pub.pem` 存放,用于校验该作者全部版本的 `.author.sig`;合集的 L2 清单会登记该文件的 SHA-512 哈希,引擎按哈希校验拉到的公钥,不一致时不采用该公钥。

| 交付物 | 来源 | 合集侧位置 |
|:---:|:---:|:---:|
| `author_pub.pem` | 构建产出的 `dist/author_pub.pem` | `plugins/<作者>/author_pub.pem` |
| `plugin.js.author.sig` | 构建产出的 `dist/plugin.js.author.sig` | 与 `plugin.js` 同目录 |

构建结束时会打印一行提示,提醒作者把 `dist/author_pub.pem` 交给合集。

## 与合集签名的关系

作者签名与合集签名是两层独立的签名,互不替代:

| 签名 | 签名者 | 产物 | 信任来源 |
|:---:|:---:|:---:|:---:|
| 作者签名 | 插件作者 | `plugin.js.author.sig` | 作者公钥 `plugins/<作者>/author_pub.pem` |
| 合集签名 | 插件合集 | `plugin.js.sig`、各层 `manifest.json.sig` | 根 CA 签发的合集 EEC 证书,以 CMS 分离签名签发 |

作者只负责产出 `.author.sig` 与 `author_pub.pem`。CMS 的 `*.sig` 由合集在收录时生成,作者不要自己产出,也不要把 `.author.sig` 改名成 `.sig`。合集侧的证书体系、三层清单与来源结论属上游 PKI 文档(DeepSeek-Chat-Enhanced 的 `docs/user/develop/basic/trust-chain.md`),插件作者不需要接触任何证书材料,也不签发、不续签、不替换任何证书。
