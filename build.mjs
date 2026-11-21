import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(root, 'dist')
const entry = path.join(root, 'src', 'index.ts')

const PLUGIN_FILE = 'plugin.js'
const META_FILE = 'meta.json'
const MARKER_FILE = 'MUST_PLUSH_WITH_PACKAGE'

/** 作者分离签名后缀:与被签名文件同名,追加该后缀 */
const AUTHOR_SIG_SUFFIX = '.author.sig'
/** 作者公钥文件名,仅在启用作者签名时产出,交给插件合集 */
const AUTHOR_PUB_FILE = 'author_pub.pem'
/**
 * 需要作者签名的产物,按固定顺序处理。
 * 只签 plugin.js:meta.json 的完整性由插件合集的三层哈希清单覆盖,
 * 作者对 meta.json 的签名已取消,不再产出 meta.json.author.sig。
 */
const AUTHOR_SIGNED_FILES = [PLUGIN_FILE]
/** Ed25519 签名长度固定为 64 字节 */
const ED25519_SIGNATURE_BYTES = 64

const SIGN_ENABLE_VAR = 'AUTHOR_SIGN_ENABLE'
const SIGN_KEY_VAR = 'AUTHOR_SIGN_PRIVATE_KEY'

/** openssl 可执行文件,可用 OPENSSL_BIN 覆盖 */
const OPENSSL_BIN = process.env.OPENSSL_BIN || 'openssl'
/** pkeyutl -rawin 需要 OpenSSL 3.0 及以上 */
const MIN_OPENSSL_MAJOR = 3

// 浏览器目标与 dsc 宿主支持的版本保持一致
const target = ['chrome105', 'edge105', 'safari16', 'firefox110']

// 默认行压缩,--no-minify 关闭
const minify = !process.argv.includes('--no-minify')

/* ---------- 退出与临时文件 ---------- */

// 临时文件(私钥副本、临时目录)集中登记,任何退出路径都会清理
const tempPaths = []

const cleanupTemp = () => {
  for (const target of tempPaths.splice(0)) {
    try {
      rmSync(target, { recursive: true, force: true })
    } catch {
      // 清理失败不覆盖原始报错
    }
  }
}

const die = (message) => {
  cleanupTemp()
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

/* ---------- 换行:文本产物一律 LF ---------- */

const toLf = (text) => Buffer.from(text.replace(/\r\n?/g, '\n'), 'utf8')

const assertLf = (bytes, name) => {
  if (bytes.includes(0x0d)) die(name + ' 含有 CR 字节,产物必须是 LF 换行')
}

/* ---------- meta.json:从 package.json 生成 ---------- */

const NAME_PATTERN = /^(?:dsc-[a-z0-9][a-z0-9._-]*|@[a-z0-9][a-z0-9._-]*\/dsc-[a-z0-9][a-z0-9._-]*)$/
const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/
const PLUGIN_ID_PATTERN = /^[a-z][a-z0-9-]{2,63}$/

/** 从 dsc 块原样搬运到 meta.json 的字段:写了就产出,没写就不产出 */
const META_PASSTHROUGH_FIELDS = ['capabilities', 'mounts', 'conflicts']

/** 能力表,取值与 schemas/runtime/meta.json 的 capability 枚举一致 */
const CAPABILITIES = [
  'sessions:list',
  'sessions:read',
  'sessions:rename',
  'events:session',
  'notify',
  'settings:locale',
  'net:fetch',
  'assets:read',
  'plugins:storage',
  'chat:request',
  'provider:source',
]

/** 挂载点表,取值与 schemas/runtime/meta.json 的 mount 枚举一致 */
const MOUNTS = ['session:changed', 'chat:before-request']

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

  // 三项原样搬运:写什么就产出什么,没写就不产出该字段,不补空数组
  for (const key of META_PASSTHROUGH_FIELDS) {
    if (dsc[key] !== undefined) meta[key] = dsc[key]
  }

  return meta
}

/* ---------- schema 自校验 ---------- */

const META_FIELDS = [
  'name',
  'version',
  'license',
  'description',
  'author',
  'home_page',
  'repo_link',
  'dependencies',
  'attached',
  ...META_PASSTHROUGH_FIELDS,
]
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

  // capabilities 与 mounts 只接受表内取值,且不得重复,与 Schema 的 enum + uniqueItems 一致
  const validateEnumList = (key, allowed) => {
    const list = meta[key]
    if (!Array.isArray(list)) {
      errors.push(key + ' 必须是数组')
      return
    }
    for (const item of list) {
      if (!isText(item)) errors.push(key + ' 的元素必须是非空字符串')
      else if (!allowed.includes(item)) errors.push(key + ' 不允许的取值: ' + item + ',只接受 ' + allowed.join('、'))
    }
    if (new Set(list).size !== list.length) errors.push(key + ' 的元素不得重复')
  }

  if ('capabilities' in meta) validateEnumList('capabilities', CAPABILITIES)
  if ('mounts' in meta) validateEnumList('mounts', MOUNTS)

  // conflicts 的元素按清单 id 规则取值;Schema 未要求去重,这里也不判重
  if ('conflicts' in meta) {
    const conflicts = meta.conflicts
    if (!Array.isArray(conflicts)) {
      errors.push('conflicts 必须是数组')
    } else {
      for (const id of conflicts) {
        if (!isText(id) || !PLUGIN_ID_PATTERN.test(id)) {
          errors.push('conflicts 的元素必须是插件 id,匹配 ' + PLUGIN_ID_PATTERN.source + ',实际为 ' + JSON.stringify(id))
        }
      }
    }
  }

  return errors
}

/* ---------- openssl 子进程 ---------- */

const firstLines = (text, count = 3) => String(text || '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(0, count)
  .join(' ')

const opensslMissing = () =>
  '无法执行 ' + OPENSSL_BIN + ',请先安装 OpenSSL ' + MIN_OPENSSL_MAJOR + '.0 及以上,并确认它在 PATH 中(可用 OPENSSL_BIN 指定路径)'

/** 执行 openssl,返回结果而不抛错,便于按场景给出可读提示 */
const tryOpenssl = (args) => {
  const result = spawnSync(OPENSSL_BIN, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (result.error) {
    if (result.error.code === 'ENOENT') die(opensslMissing())
    return { ok: false, stdout: '', stderr: result.error.message }
  }
  return { ok: result.status === 0, stdout: String(result.stdout || ''), stderr: String(result.stderr || '') }
}

const runOpenssl = (args, label) => {
  const result = tryOpenssl(args)
  if (result.ok) return result.stdout
  const detail = firstLines(result.stderr) || firstLines(result.stdout)
  die(label + ' 失败' + (detail === '' ? '' : ':' + detail))
}

const requireOpenssl = () => {
  const text = runOpenssl(['version'], 'openssl version').trim()
  const matched = text.match(/OpenSSL\s+(\d+)\.(\d+)\.(\d+)/)
  if (!matched) die('无法解析 OpenSSL 版本输出: ' + text)
  if (Number(matched[1]) < MIN_OPENSSL_MAJOR) {
    die('需要 OpenSSL ' + MIN_OPENSSL_MAJOR + '.0 及以上,当前为 ' + text)
  }
  return text
}

/* ---------- 作者签名:裸公钥分离签名,Ed25519 ---------- */

const signEnabled = () => (process.env[SIGN_ENABLE_VAR] ?? '').trim().toLowerCase() === 'true'

/**
 * 把 AUTHOR_SIGN_PRIVATE_KEY 落到临时文件并确认它是 Ed25519 私钥。
 * 取值可以是 PKCS#8 PEM 内容,也可以是私钥文件路径。
 */
const prepareAuthorKey = async () => {
  const raw = (process.env[SIGN_KEY_VAR] ?? '').trim()
  if (raw === '') {
    die(SIGN_ENABLE_VAR + '=true 时必须提供 ' + SIGN_KEY_VAR + '(Ed25519 PKCS#8 PEM 私钥或私钥文件路径),不允许静默跳过')
  }

  // .env 里写成一行的 PEM 会把换行写成字面量 \n
  let pem = raw.replace(/\\n/g, '\n')
  if (!pem.includes('-----BEGIN')) {
    const keyPath = path.resolve(root, pem.trim())
    try {
      pem = await readFile(keyPath, 'utf8')
    } catch (error) {
      die('无法读取私钥文件 ' + keyPath + ': ' + error.message)
    }
    pem = pem.replace(/\\n/g, '\n')
  }
  if (!pem.includes('-----BEGIN PRIVATE KEY-----')) {
    die(SIGN_KEY_VAR + ' 必须是 PKCS#8 PEM 私钥,应以 -----BEGIN PRIVATE KEY----- 开头')
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'dsc-author-key-'))
  tempPaths.push(dir)
  const keyPath = path.join(dir, 'author_secret.pem')
  await writeFile(keyPath, pem.endsWith('\n') ? pem : pem + '\n', { encoding: 'utf8', mode: 0o600 })

  const described = tryOpenssl(['pkey', '-in', keyPath, '-noout', '-text'])
  if (!described.ok) {
    die(SIGN_KEY_VAR + ' 无法解析为 PEM 私钥:' + (firstLines(described.stderr) || 'openssl pkey 执行失败'))
  }
  const headline = (described.stdout.split(/\r?\n/)[0] || '').trim()
  if (!/^ED25519 Private-Key:/i.test(headline)) {
    die(
      SIGN_KEY_VAR + ' 必须是 Ed25519 私钥,当前私钥类型为「' + (headline === '' ? '未知' : headline) + '」。'
      + '生成 Ed25519 密钥对:openssl genpkey -algorithm ed25519 -out author_secret.pem',
    )
  }

  return { keyPath }
}

/** 导出作者公钥,交给插件合集的 plugins/<作者>/author_pub.pem */
const exportAuthorPublicKey = async (keyPath, pubPath) => {
  runOpenssl(['pkey', '-in', keyPath, '-pubout', '-out', pubPath], '导出作者公钥')
  const bytes = toLf(await readFile(pubPath, 'utf8'))
  assertLf(bytes, AUTHOR_PUB_FILE)
  await writeFile(pubPath, bytes)
}

/**
 * 对单个产物生成 <文件>.author.sig,并用推导出的公钥自检。
 * 签名对象是落盘后的原始字节,不做任何换行规范化。
 */
const signAuthorFile = async (keyPath, pubPath, name) => {
  const filePath = path.join(distDir, name)
  const sigPath = filePath + AUTHOR_SIG_SUFFIX

  runOpenssl(
    ['pkeyutl', '-sign', '-rawin', '-inkey', keyPath, '-in', filePath, '-out', sigPath],
    '为 ' + name + ' 生成作者签名',
  )

  const info = await stat(sigPath).catch(() => null)
  if (info === null) die('openssl 未生成签名文件: ' + sigPath)
  if (info.size !== ED25519_SIGNATURE_BYTES) {
    die(sigPath + ' 长度为 ' + info.size + ' 字节,Ed25519 签名应为 ' + ED25519_SIGNATURE_BYTES + ' 字节')
  }

  const verified = tryOpenssl(
    ['pkeyutl', '-verify', '-pubin', '-inkey', pubPath, '-rawin', '-in', filePath, '-sigfile', sigPath],
  )
  if (!verified.ok) {
    die(
      '自检失败:' + name + ' 的作者签名无法用推导出的公钥验证通过。'
      + (firstLines(verified.stderr) || firstLines(verified.stdout)),
    )
  }

  return { name, sigName: name + AUTHOR_SIG_SUFFIX, size: info.size }
}

/* ---------- 构建 ---------- */

await loadDotEnv()

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const meta = buildMeta(pkg)

const metaErrors = validateMeta(meta)
if (metaErrors.length > 0) {
  die('生成的 meta.json 不符合 schema:\n  - ' + metaErrors.join('\n  - '))
}

// 启用作者签名时先取私钥:密钥不可用时在产出任何文件之前退出
const signed = signEnabled()
let authorKey = null
if (signed) {
  requireOpenssl()
  authorKey = await prepareAuthorKey()
}

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

// 作者签名:所有产物落盘之后逐文件签名并自检
const signatures = []
if (signed) {
  const pubPath = path.join(distDir, AUTHOR_PUB_FILE)
  await exportAuthorPublicKey(authorKey.keyPath, pubPath)
  for (const name of AUTHOR_SIGNED_FILES) {
    signatures.push(await signAuthorFile(authorKey.keyPath, pubPath, name))
  }
}
cleanupTemp()

/* ---------- 产物校验与摘要 ---------- */

const entries = (await readdir(distDir)).sort()
const required = [MARKER_FILE, META_FILE, PLUGIN_FILE]
for (const name of required) {
  if (!entries.includes(name)) die('产物缺失: ' + name)
}

const expected = signed
  ? [...required, AUTHOR_PUB_FILE, ...AUTHOR_SIGNED_FILES.map((name) => name + AUTHOR_SIG_SUFFIX)].sort()
  : [...required].sort()
for (const name of expected) {
  if (!entries.includes(name)) die('已启用作者签名但没有产出 ' + name)
}
for (const name of entries) {
  if (!expected.includes(name)) die('dist 出现预期之外的产物: ' + name)
}

const pluginInfo = await stat(pluginPath)
const metaInfo = await stat(path.join(distDir, META_FILE))

console.log('产物目录: ' + path.relative(root, distDir))
for (const name of entries) {
  const info = await stat(path.join(distDir, name))
  console.log('  ' + name + '  ' + info.size + ' 字节')
}
console.log('行压缩: ' + (minify ? '开启' : '关闭'))
console.log('作者签名: ' + (signed
  ? '已启用,' + signatures.map((item) => item.sigName).join(' 与 ') + ' 已用推导出的公钥自检通过'
  : '未启用,不产出 ' + AUTHOR_SIG_SUFFIX + ' 与 ' + AUTHOR_PUB_FILE))
console.log('换行: LF(文本产物),' + AUTHOR_SIG_SUFFIX + ' 为二进制签名文件')
console.log('体积: ' + pluginInfo.size + ' 字节 (' + (pluginInfo.size / 1024).toFixed(2) + ' KB),meta ' + metaInfo.size + ' 字节')

if (signed) {
  console.log('公钥交付: 把 dist/' + AUTHOR_PUB_FILE + ' 交给插件合集,放到 plugins/<作者>/' + AUTHOR_PUB_FILE)
}
