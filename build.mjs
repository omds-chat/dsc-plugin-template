import { createHash, createPrivateKey, sign as signDigest } from 'node:crypto'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(root, 'dist')
const entry = path.join(root, 'src', 'index.ts')

const PLUGIN_FILE = 'plugin.js'
const META_FILE = 'meta.json'
const SIGN_FILE = 'plugin_sign.json'
const MARKER_FILE = 'MUST_PLUSH_WITH_PACKAGE'

const SIGN_ENABLE_VAR = 'AUTHOR_SIGN_ENABLE'
const SIGN_KEY_VAR = 'AUTHOR_SIGN_PRIVATE_KEY'

// 浏览器目标与 dsc 宿主支持的版本保持一致
const target = ['chrome105', 'edge105', 'safari16', 'firefox110']

// 默认行压缩,--no-minify 关闭
const minify = !process.argv.includes('--no-minify')

const die = (message) => {
  console.error('构建失败: ' + message)
  process.exit(1)
}

/* ---------- 环境变量:读取仓库根目录的 .env ---------- */

const loadDotEnv = async () => {
  let text
  try {
    text = await readFile(path.join(root, '.env'), 'utf8')
  } catch {
    return
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    const quoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
    if (quoted && value.length >= 2) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

/* ---------- 换行:产物一律 LF ---------- */

const toLf = (text) => Buffer.from(text.replace(/\r\n?/g, '\n'), 'utf8')

const assertLf = (bytes, name) => {
  if (bytes.includes(0x0d)) die(name + ' 含有 CR 字节,产物必须是 LF 换行')
}

/* ---------- meta.json:从 package.json 生成 ---------- */

const NAME_PATTERN = /^(?:dsc-[a-z0-9][a-z0-9._-]*|@[a-z0-9][a-z0-9._-]*\/dsc-[a-z0-9][a-z0-9._-]*)$/
const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value) => typeof value === 'string' && value.length > 0

const isLink = (value) => {
  if (!isText(value)) return false
  try {
    return new URL(value).protocol.length > 1
  } catch {
    return false
  }
}

const buildMeta = (pkg) => {
  if (!isObject(pkg.dsc)) die('package.json 缺少 dsc 块')
  if (typeof pkg.author !== 'string') die('package.json 的 author 必须是字符串')

  const dsc = pkg.dsc
  const meta = {
    name: pkg.name,
    version: pkg.version,
    license: pkg.license,
    description: dsc.description,
    author: pkg.author,
    repo_link: dsc.repo_link,
    dependencies: { dsc: dsc.engines },
  }

  if (dsc.home_page !== undefined) meta.home_page = dsc.home_page
  if (dsc.attached !== undefined) meta.attached = dsc.attached

  return meta
}

/* ---------- schema 自校验 ---------- */

const META_FIELDS = ['name', 'version', 'license', 'description', 'author', 'home_page', 'repo_link', 'dependencies', 'attached']
const META_REQUIRED = ['name', 'version', 'license', 'description', 'author', 'repo_link', 'dependencies']

const validateMeta = (meta) => {
  const errors = []
  if (!isObject(meta)) return ['meta.json 必须是对象']

  for (const key of Object.keys(meta)) {
    if (!META_FIELDS.includes(key)) errors.push('不允许的字段: ' + key)
  }
  for (const key of META_REQUIRED) {
    if (!(key in meta)) errors.push('缺少必填字段: ' + key)
  }

  if ('name' in meta && !(isText(meta.name) && meta.name.length <= 214 && NAME_PATTERN.test(meta.name))) {
    errors.push('name 必须是合法 npm 包名:全局包为 dsc-xxx,用户命名空间包为 @scope/dsc-xxx')
  }
  if ('version' in meta && !(isText(meta.version) && VERSION_PATTERN.test(meta.version))) {
    errors.push('version 必须是 x.y.z 形式的三段数字')
  }
  if ('license' in meta && !isText(meta.license)) errors.push('license 必须是非空字符串')
  if ('author' in meta && !isText(meta.author)) errors.push('author 必须是非空字符串')

  if ('description' in meta) {
    const description = meta.description
    if (!isObject(description)) {
      errors.push('description 必须是对象')
    } else {
      for (const key of Object.keys(description)) {
        if (key !== 'zh-CN' && key !== 'en-US') errors.push('description 不允许的语言: ' + key)
        else if (!isText(description[key])) errors.push('description.' + key + ' 必须是非空字符串')
      }
      if (!('zh-CN' in description) && !('en-US' in description)) {
        errors.push('description 至少需要 zh-CN 或 en-US')
      }
    }
  }

  for (const key of ['home_page', 'repo_link']) {
    if (key in meta && !isLink(meta[key])) errors.push(key + ' 必须是合法的 URI')
  }

  if ('dependencies' in meta) {
    const dependencies = meta.dependencies
    if (!isObject(dependencies)) {
      errors.push('dependencies 必须是对象')
    } else {
      for (const key of Object.keys(dependencies)) {
        if (key !== 'dsc') errors.push('dependencies 不允许的键: ' + key)
      }
      if (!('dsc' in dependencies)) errors.push('dependencies 必须包含 dsc')
      else if (!isText(dependencies.dsc)) errors.push('dependencies.dsc 必须是非空字符串')
    }
  }

  if ('attached' in meta) {
    const attached = meta.attached
    if (!isObject(attached)) {
      errors.push('attached 必须是对象')
    } else {
      for (const key of Object.keys(attached)) {
        if (key !== 'favicon' && key !== 'intro_image') errors.push('attached 不允许的字段: ' + key)
      }
      if ('favicon' in attached && !isLink(attached.favicon)) errors.push('attached.favicon 必须是合法的 URI')
      if ('intro_image' in attached) {
        const images = attached.intro_image
        if (!Array.isArray(images)) {
          errors.push('attached.intro_image 必须是数组')
        } else {
          for (const image of images) {
            if (!isLink(image)) errors.push('attached.intro_image 的元素必须是合法的 URI')
          }
          if (new Set(images).size !== images.length) errors.push('attached.intro_image 的元素不得重复')
        }
      }
    }
  }

  return errors
}

const validateSign = (manifest) => {
  if (!isObject(manifest)) return ['plugin_sign.json 必须是对象']

  const errors = []
  for (const key of Object.keys(manifest)) {
    if (key !== 'sign') errors.push('不允许的字段: ' + key)
  }
  if (!Array.isArray(manifest.sign)) return errors.concat('sign 必须是数组')

  for (const index of manifest.sign.keys()) {
    const item = manifest.sign[index]
    const at = 'sign[' + index + ']'
    if (!isObject(item)) {
      errors.push(at + ' 必须是对象')
      continue
    }
    for (const key of Object.keys(item)) {
      if (key !== 'value' && key !== 'for' && key !== 'signer') errors.push(at + ' 不允许的字段: ' + key)
    }
    for (const key of ['value', 'for', 'signer']) {
      if (typeof item[key] !== 'string') errors.push(at + '.' + key + ' 必须是字符串')
    }
  }

  return errors
}

/* ---------- 作者自签名:hash-then-sign,Ed25519 ---------- */

const signEnabled = () => (process.env[SIGN_ENABLE_VAR] ?? '').trim().toLowerCase() === 'true'

const loadPrivateKey = async () => {
  const raw = (process.env[SIGN_KEY_VAR] ?? '').trim()
  if (raw === '') die(SIGN_ENABLE_VAR + '=true 时必须提供 ' + SIGN_KEY_VAR + ',不允许静默跳过')

  let pem = raw
  if (!raw.includes('-----BEGIN')) {
    // 不是 PEM 内容时按文件路径读取
    const keyPath = path.resolve(root, raw)
    try {
      pem = await readFile(keyPath, 'utf8')
    } catch (error) {
      die('无法读取私钥文件 ' + keyPath + ': ' + error.message)
    }
  }

  try {
    // .env 里写成一行的 PEM 会把换行写成字面量 \n
    const key = createPrivateKey({ key: pem.replace(/\\n/g, '\n'), format: 'pem' })
    if (key.asymmetricKeyType !== 'ed25519') die(SIGN_KEY_VAR + ' 必须是 Ed25519 私钥')
    return key
  } catch (error) {
    die('无法解析 ' + SIGN_KEY_VAR + ': ' + error.message)
  }
}

const signBytes = (privateKey, bytes) => {
  const digest = createHash('sha512').update(bytes).digest()
  return signDigest(null, digest, privateKey).toString('base64')
}

/* ---------- 构建 ---------- */

await loadDotEnv()

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const meta = buildMeta(pkg)

const metaErrors = validateMeta(meta)
if (metaErrors.length > 0) {
  die('生成的 meta.json 不符合 schema:\n  - ' + metaErrors.join('\n  - '))
}

// 启用自签名时先取私钥:密钥不可用时在产出任何文件之前退出
const signed = signEnabled()
const privateKey = signed ? await loadPrivateKey() : null

// 打包前清空 dist,避免残留旧产物
await rm(distDir, { recursive: true, force: true })
await mkdir(distDir, { recursive: true })

const pluginPath = path.join(distDir, PLUGIN_FILE)

await build({
  entryPoints: [entry],
  outfile: pluginPath,
  bundle: true,
  format: 'esm',
  target,
  platform: 'browser',
  splitting: false,
  minify,
  charset: 'utf8',
  legalComments: 'none',
  external: [],
  logLevel: 'warning',
})

// 归一化换行后再取字节,签名针对最终落盘的内容
const pluginBytes = toLf(await readFile(pluginPath, 'utf8'))
await writeFile(pluginPath, pluginBytes)
assertLf(pluginBytes, PLUGIN_FILE)

const metaBytes = Buffer.from(JSON.stringify(meta, null, 2) + '\n', 'utf8')
assertLf(metaBytes, META_FILE)
await writeFile(path.join(distDir, META_FILE), metaBytes)

await writeFile(path.join(distDir, MARKER_FILE), Buffer.alloc(0))

if (signed) {
  const manifest = {
    sign: [
      { value: signBytes(privateKey, metaBytes), for: META_FILE, signer: pkg.author },
      { value: signBytes(privateKey, pluginBytes), for: PLUGIN_FILE, signer: pkg.author },
    ],
  }

  const signErrors = validateSign(manifest)
  if (signErrors.length > 0) {
    die('生成的 plugin_sign.json 不符合 schema:\n  - ' + signErrors.join('\n  - '))
  }

  const signBytesOut = Buffer.from(JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  assertLf(signBytesOut, SIGN_FILE)
  await writeFile(path.join(distDir, SIGN_FILE), signBytesOut)
}

/* ---------- 产物校验与摘要 ---------- */

const entries = (await readdir(distDir)).sort()
const required = [MARKER_FILE, META_FILE, PLUGIN_FILE]
for (const name of required) {
  if (!entries.includes(name)) die('产物缺失: ' + name)
}
if (signed && !entries.includes(SIGN_FILE)) die('已启用自签名但没有产出 ' + SIGN_FILE)
if (!signed && entries.includes(SIGN_FILE)) die('未启用自签名却出现了 ' + SIGN_FILE)
for (const name of entries) {
  if (!required.includes(name) && name !== SIGN_FILE) die('dist 出现预期之外的产物: ' + name)
}

const pluginInfo = await stat(pluginPath)
const metaInfo = await stat(path.join(distDir, META_FILE))

console.log('产物目录: ' + path.relative(root, distDir))
for (const name of entries) {
  const info = await stat(path.join(distDir, name))
  console.log('  ' + name + '  ' + info.size + ' 字节')
}
console.log('行压缩: ' + (minify ? '开启' : '关闭'))
console.log('作者自签名: ' + (signed ? '已启用,signer=' + pkg.author : '未启用,不产出 ' + SIGN_FILE))
console.log('换行: LF')
console.log('体积: ' + pluginInfo.size + ' 字节 (' + (pluginInfo.size / 1024).toFixed(2) + ' KB),meta ' + metaInfo.size + ' 字节')
