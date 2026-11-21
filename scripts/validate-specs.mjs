/*
 * 规范区校验脚本:零第三方依赖,只校验本仓库的 Schema、样例与本仓库自身的 meta 数据。
 * 支持 JSON Schema 2020-12 的常用子集,足够覆盖 schemas/ 下的两份 Schema。
 * 用法:
 *   node scripts/validate-specs.mjs                     自检
 *   node scripts/validate-specs.mjs <文件> [--schema meta|manifest]  校验单个文档
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DRAFT = 'https://json-schema.org/draft/2020-12/schema'
const SCHEMA_FILES = {
  manifest: { path: 'schemas/manifest/plugin-manifest.schema.json', versionKey: 'manifest' },
  meta: { path: 'schemas/runtime/meta.json', versionKey: 'runtime_meta' },
}
const EXAMPLE_DIR = 'schemas/examples'
const INVALID_DIR = 'schemas/examples/invalid'
const SPEC_VERSION_FILE = 'specs/spec-version.json'

const SUPPORTED_KEYWORDS = new Set([
  '$schema',
  '$id',
  '$defs',
  '$ref',
  '$comment',
  'title',
  'description',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'pattern',
  'minLength',
  'maxLength',
  'format',
  'enum',
  'const',
  'items',
  'uniqueItems',
  'minItems',
  'maxItems',
  'anyOf',
  'allOf',
  'oneOf',
  'minimum',
  'maximum',
  'minProperties',
  'maxProperties',
  'examples',
  'default',
  'deprecated',
])
const SUBSCHEMA_SINGLE = ['items', 'additionalProperties', 'not', 'if', 'then', 'else']
const SUBSCHEMA_LIST = ['anyOf', 'allOf', 'oneOf']
const SUBSCHEMA_MAP = ['properties', '$defs']

const patternCache = new Map()

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

const typeOf = (value) => {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  return typeof value
}

const matchesType = (value, type) => {
  if (type === 'integer') {
    return typeof value === 'number' && Number.isInteger(value)
  }
  if (type === 'number') {
    return typeof value === 'number'
  }
  return typeOf(value) === type
}

const compilePattern = (pattern) => {
  if (patternCache.has(pattern)) {
    return patternCache.get(pattern)
  }
  let compiled = null
  try {
    compiled = new RegExp(pattern)
  } catch {
    compiled = null
  }
  patternCache.set(pattern, compiled)
  return compiled
}

const resolvePointer = (ref, document) => {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) {
    return undefined
  }
  const segments = ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
  let node = document
  for (const segment of segments) {
    if (!isPlainObject(node) && !Array.isArray(node)) {
      return undefined
    }
    node = node[segment]
    if (node === undefined) {
      return undefined
    }
  }
  return node
}

const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right)

const validateNode = (schema, value, at, rootSchema, errors, stack) => {
  if (schema === true) {
    return
  }
  if (schema === false) {
    errors.push(at + ': 该位置不允许出现任何值')
    return
  }
  if (!isPlainObject(schema)) {
    errors.push(at + ': 子 schema 必须是对象或布尔值')
    return
  }
  if (stack.length > 32) {
    errors.push(at + ': $ref 嵌套过深')
    return
  }

  if (schema.$ref !== undefined) {
    const target = resolvePointer(schema.$ref, rootSchema)
    if (target === undefined) {
      errors.push(at + ': 无法解析 $ref ' + schema.$ref)
      return
    }
    validateNode(target, value, at, rootSchema, errors, [...stack, schema.$ref])
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!types.some((type) => matchesType(value, type))) {
      errors.push(at + ': 类型应为 ' + types.join(' 或 ') + ',实际为 ' + typeOf(value))
      return
    }
  }

  if (schema.const !== undefined && !sameValue(schema.const, value)) {
    errors.push(at + ': 取值必须是 ' + JSON.stringify(schema.const))
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((item) => sameValue(item, value))) {
    errors.push(at + ': 取值必须是 ' + schema.enum.map((item) => JSON.stringify(item)).join('、') + ' 之一,实际为 ' + JSON.stringify(value))
  }

  if (typeof value === 'string') {
    const length = [...value].length
    if (schema.minLength !== undefined && length < schema.minLength) {
      errors.push(at + ': 长度不得小于 ' + String(schema.minLength))
    }
    if (schema.maxLength !== undefined && length > schema.maxLength) {
      errors.push(at + ': 长度不得大于 ' + String(schema.maxLength))
    }
    if (schema.pattern !== undefined) {
      const compiled = compilePattern(schema.pattern)
      if (compiled === null) {
        errors.push(at + ': schema 的 pattern 无法编译: ' + schema.pattern)
      } else if (!compiled.test(value)) {
        errors.push(at + ': ' + JSON.stringify(value) + ' 不符合 ' + schema.pattern)
      }
    }
    if (schema.format === 'uri') {
      let parsed = null
      try {
        parsed = new URL(value)
      } catch {
        parsed = null
      }
      if (parsed === null) {
        errors.push(at + ': ' + JSON.stringify(value) + ' 不是合法的 URI')
      }
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(at + ': 不得小于 ' + String(schema.minimum))
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(at + ': 不得大于 ' + String(schema.maximum))
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(at + ': 元素个数不得少于 ' + String(schema.minItems))
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(at + ': 元素个数不得多于 ' + String(schema.maxItems))
    }
    if (schema.uniqueItems === true) {
      const seen = new Set()
      for (const item of value) {
        const key = JSON.stringify(item)
        if (seen.has(key)) {
          errors.push(at + ': 元素不得重复,发现 ' + key)
        }
        seen.add(key)
      }
    }
    if (schema.items !== undefined) {
      value.forEach((item, index) => {
        validateNode(schema.items, item, at + '/' + String(index), rootSchema, errors, stack)
      })
    }
  }

  if (isPlainObject(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          errors.push(at + ': 缺少必填字段 ' + key)
        }
      }
    }
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) {
      errors.push(at + ': 字段个数不得少于 ' + String(schema.minProperties))
    }
    if (schema.maxProperties !== undefined && Object.keys(value).length > schema.maxProperties) {
      errors.push(at + ': 字段个数不得多于 ' + String(schema.maxProperties))
    }
    const properties = isPlainObject(schema.properties) ? schema.properties : {}
    for (const key of Object.keys(value)) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        validateNode(properties[key], value[key], at + '/' + key, rootSchema, errors, stack)
      } else if (schema.additionalProperties === false) {
        errors.push(at + ': 不允许的字段 ' + key)
      } else if (isPlainObject(schema.additionalProperties)) {
        validateNode(schema.additionalProperties, value[key], at + '/' + key, rootSchema, errors, stack)
      }
    }
  }

  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      validateNode(sub, value, at, rootSchema, errors, stack)
    }
  }

  if (Array.isArray(schema.anyOf)) {
    let matched = false
    for (const sub of schema.anyOf) {
      const subErrors = []
      validateNode(sub, value, at, rootSchema, subErrors, stack)
      if (subErrors.length === 0) {
        matched = true
        break
      }
    }
    if (!matched) {
      errors.push(at + ': 必须满足 anyOf 中的至少一项')
    }
  }

  if (Array.isArray(schema.oneOf)) {
    let matchedCount = 0
    for (const sub of schema.oneOf) {
      const subErrors = []
      validateNode(sub, value, at, rootSchema, subErrors, stack)
      if (subErrors.length === 0) {
        matchedCount += 1
      }
    }
    if (matchedCount !== 1) {
      errors.push(at + ': 必须恰好满足 oneOf 中的一项,实际满足 ' + String(matchedCount) + ' 项')
    }
  }
}

const walkSchema = (schema, at, rootSchema, file, errors) => {
  if (schema === true || schema === false) {
    return
  }
  if (!isPlainObject(schema)) {
    errors.push(file + ' ' + at + ': 子 schema 必须是对象或布尔值')
    return
  }
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(key)) {
      errors.push(file + ' ' + at + ': 未支持的 schema 关键字 ' + key)
    }
  }
  if (typeof schema.$ref === 'string' && resolvePointer(schema.$ref, rootSchema) === undefined) {
    errors.push(file + ' ' + at + ': $ref 无法解析 ' + schema.$ref)
  }
  if (typeof schema.pattern === 'string' && compilePattern(schema.pattern) === null) {
    errors.push(file + ' ' + at + ': pattern 无法编译 ' + schema.pattern)
  }
  for (const key of SUBSCHEMA_SINGLE) {
    if (key in schema) {
      walkSchema(schema[key], at + '/' + key, rootSchema, file, errors)
    }
  }
  for (const key of SUBSCHEMA_LIST) {
    if (Array.isArray(schema[key])) {
      schema[key].forEach((sub, index) => {
        walkSchema(sub, at + '/' + key + '/' + String(index), rootSchema, file, errors)
      })
    }
  }
  for (const key of SUBSCHEMA_MAP) {
    if (isPlainObject(schema[key])) {
      for (const [name, sub] of Object.entries(schema[key])) {
        walkSchema(sub, at + '/' + key + '/' + name, rootSchema, file, errors)
      }
    }
  }
}

const readJson = (relativePath) => {
  const absolute = path.join(ROOT, relativePath)
  if (!existsSync(absolute)) {
    throw new Error('文件不存在: ' + relativePath)
  }
  return JSON.parse(readFileSync(absolute, 'utf8'))
}

const loadSchema = (name) => {
  const relativePath = SCHEMA_FILES[name].path
  const document = readJson(relativePath)
  const errors = []
  walkSchema(document, '#', document, relativePath, errors)
  if (document.$schema !== DRAFT) {
    errors.push(relativePath + ': $schema 必须是 ' + DRAFT)
  }
  if (typeof document.$id !== 'string' || !document.$id.startsWith('https://')) {
    errors.push(relativePath + ': 必须提供 https 的 $id')
  } else if (!document.$id.endsWith(relativePath)) {
    errors.push(relativePath + ': $id 必须以文件路径结尾,当前为 ' + document.$id)
  }
  return { document, relativePath, errors }
}

const validateDocument = (schema, document) => {
  const errors = []
  validateNode(schema, document, '#', schema, errors, [])
  return errors
}

const deriveMetaFromPackage = () => {
  const pkg = readJson('package.json')
  const dsc = isPlainObject(pkg.dsc) ? pkg.dsc : null
  if (dsc === null) {
    throw new Error('package.json 缺少 dsc 块')
  }
  const meta = {
    name: pkg.name,
    version: pkg.version,
    license: pkg.license,
    description: dsc.description,
    author: pkg.author,
    repo_link: dsc.repo_link,
    dependencies: { dsc: dsc.engines },
  }
  if (dsc.home_page !== undefined) {
    meta.home_page = dsc.home_page
  }
  if (dsc.attached !== undefined) {
    meta.attached = dsc.attached
  }
  // 与 build.mjs 的 buildMeta 保持一致:三项原样搬运,没写就不产出
  for (const key of ['capabilities', 'mounts', 'conflicts']) {
    if (dsc[key] !== undefined) {
      meta[key] = dsc[key]
    }
  }
  return meta
}

const fixtureSchemaName = (fileName) => (fileName.startsWith('meta.') ? 'meta' : 'manifest')

const selfCheck = () => {
  const failures = []
  const report = (label, passed, detail) => {
    const suffix = detail === undefined || detail === '' ? '' : ': ' + detail
    console.log((passed ? '通过  ' : '失败  ') + label + suffix)
    if (!passed) {
      failures.push(label)
    }
  }

  console.log('[1/4] 规范版本与 Schema 文件')
  const specVersion = readJson(SPEC_VERSION_FILE)
  const versionFields = ['spec_version', 'dsc_core']
  let versionOk = true
  for (const field of versionFields) {
    if (typeof specVersion[field] !== 'string' || !/^\d+\.\d+\.\d+$/.test(specVersion[field])) {
      report(SPEC_VERSION_FILE + ' 字段 ' + field, false, '必须是三段数字')
      versionOk = false
    }
  }
  for (const name of Object.keys(SCHEMA_FILES)) {
    const expected = SCHEMA_FILES[name]
    const actual = isPlainObject(specVersion.schemas) ? specVersion.schemas[expected.versionKey] : undefined
    if (actual !== expected.path) {
      report(SPEC_VERSION_FILE + ' 的 schemas.' + expected.versionKey, false, '必须指向 ' + expected.path)
      versionOk = false
    }
  }
  if (versionOk) {
    report('规范版本与 Schema 路径', true, 'spec_version ' + specVersion.spec_version + ',dsc_core ' + specVersion.dsc_core)
  }

  console.log('[2/4] Schema 结构')
  const schemas = {}
  for (const name of Object.keys(SCHEMA_FILES)) {
    const loaded = loadSchema(name)
    schemas[name] = loaded
    report(loaded.relativePath, loaded.errors.length === 0, loaded.errors.join('; '))
  }

  console.log('[3/4] 样例文档')
  const exampleFiles = readdirSync(path.join(ROOT, EXAMPLE_DIR))
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()
  for (const fileName of exampleFiles) {
    const relativePath = EXAMPLE_DIR + '/' + fileName
    const schema = schemas[fixtureSchemaName(fileName)]
    const errors = validateDocument(schema.document, readJson(relativePath))
    report('正例 ' + relativePath, errors.length === 0, errors.slice(0, 3).join('; '))
  }
  const invalidFiles = readdirSync(path.join(ROOT, INVALID_DIR))
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()
  for (const fileName of invalidFiles) {
    const relativePath = INVALID_DIR + '/' + fileName
    const schema = schemas[fixtureSchemaName(fileName)]
    const errors = validateDocument(schema.document, readJson(relativePath))
    report('反例 ' + relativePath + ' 已被拒绝', errors.length > 0, errors.length > 0 ? '' : '未发现任何错误')
    if (errors.length > 0) {
      console.log('      首个错误: ' + errors[0])
    }
  }

  console.log('[4/4] 本仓库数据')
  const metaErrors = validateDocument(schemas.meta.document, deriveMetaFromPackage())
  report('package.json 派生的 meta.json', metaErrors.length === 0, metaErrors.join('; '))
  if (existsSync(path.join(ROOT, 'dist/meta.json'))) {
    const distErrors = validateDocument(schemas.meta.document, readJson('dist/meta.json'))
    report('构建产物 meta.json', distErrors.length === 0, distErrors.join('; '))
  }

  if (failures.length > 0) {
    console.error('自检未通过,失败项 ' + String(failures.length) + ' 个')
    process.exitCode = 1
    return
  }
  console.log('自检通过: ' + String(Object.keys(SCHEMA_FILES).length) + ' 份 Schema,' + String(exampleFiles.length) + ' 个正例,' + String(invalidFiles.length) + ' 个反例')
}

const args = process.argv.slice(2)
const schemaFlagIndex = args.indexOf('--schema')
let schemaName = 'manifest'
if (schemaFlagIndex >= 0) {
  const value = args[schemaFlagIndex + 1]
  if (value !== 'manifest' && value !== 'meta') {
    console.error('--schema 只接受 manifest 或 meta')
    process.exit(2)
  }
  schemaName = value
  args.splice(schemaFlagIndex, 2)
}
if (args.length === 0) {
  selfCheck()
} else if (args.length === 1) {
  const relativePath = path.relative(ROOT, path.resolve(process.cwd(), args[0]))
  const loaded = loadSchema(schemaName)
  if (loaded.errors.length > 0) {
    console.error(loaded.relativePath + ' 本身有问题: ' + loaded.errors.join('; '))
    process.exit(1)
  }
  const errors = validateDocument(loaded.document, readJson(relativePath))
  if (errors.length > 0) {
    console.error(relativePath + ' 不符合 ' + loaded.relativePath + ':')
    for (const error of errors) {
      console.error('  - ' + error)
    }
    process.exit(1)
  }
  console.log(relativePath + ' 通过 ' + loaded.relativePath)
} else {
  console.error('用法: node scripts/validate-specs.mjs [<文件> [--schema manifest|meta]]')
  process.exit(2)
}
