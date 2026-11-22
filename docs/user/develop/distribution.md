# 发布指南

交付前按[发布前自检](#发布前自检)核对;签名材料的产出见 [signing.md](signing.md),构建与产物细节见 [build.md](build.md)。

## 交付物

- 交付 `dist/` 整个目录,不要只交付 `plugin.js`:`meta.json` 是市场识别插件的依据,`MUST_PLUSH_WITH_PACKAGE` 表明该目录必须随包分发。
- 目录结构、`meta.json` 的字段名与 `.author.sig` 的命名都不要改动,市场与合集按约定解析。
- 需要作者签名时,连同 `plugin.js.author.sig` 与 `author_pub.pem` 一起交付,并把公钥交给插件合集放到 `plugins/<作者>/author_pub.pem`。
- 离线包分发(zip 与 tgz)的包内布局与预检顺序见[插件开发规范](../../../specs/plugin-develop-spec.md) 6.2。

## 托管

- 产物托管在支持 `https` 的静态站点或 CDN 上,保持地址稳定;地址失效会影响检查更新与重新安装,已安装插件的启动恢复只用安装时保存的代码。
- 跨源托管必须返回 `Access-Control-Allow-Origin` 响应头(取件默认不携带凭证,`*` 即可),否则安装结果为 `artifact-unreachable`;细则见 [build.md](build.md) 与[插件开发规范](../../../specs/plugin-develop-spec.md) 6.1。
- `dist/` 已被 `.gitignore` 忽略,需要交付产物时在 Release 中附带。

## 发布前自检

```bash
pnpm run type                   # 类型检查
node scripts/validate-specs.mjs # 清单与 meta 的 Schema 自检
pnpm run build                  # 产出 plugin.js、meta.json,可选作者签名
```

- 发布前在浏览器控制台执行一次 `import('https://你的地址/plugin.js')`,确认没有语法错误与缺失依赖。
- 再在宿主的插件面板里装一次,确认激活、日志与停用都正常(见 [build.md](build.md)「把产物装进宿主验证」)。
- 插件运行在用户浏览器中,可以读取当前会话的可见字段,不能读取 API Key、附件原件与其他插件的数据;分发时必须提示用户只安装信任来源的插件。
- [README.user.md](../../../README.user.md) 是面向普通用户的说明文档,发布前把其中的占位内容替换为实际的插件说明。
