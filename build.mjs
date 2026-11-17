import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(root, 'dist')
const entry = path.join(root, 'src', 'index.ts')
const outfile = path.join(distDir, 'plugin.js')

// 浏览器目标与 dsc 宿主支持的版本保持一致
const target = ['chrome105', 'edge105', 'safari16', 'firefox110']

// 打包前清空 dist,避免残留旧产物
await rm(distDir, { recursive: true, force: true })
await mkdir(distDir, { recursive: true })

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: 'esm',
  target,
  platform: 'browser',
  splitting: false,
  minify: true,
  charset: 'utf8',
  legalComments: 'none',
  external: [],
  logLevel: 'warning',
})

// 产物必须是单文件：dist 下只允许存在 plugin.js
const entries = await readdir(distDir)
if (entries.length !== 1 || entries[0] !== 'plugin.js') {
  throw new Error('产物不是单文件: ' + entries.join(', '))
}

const info = await stat(outfile)
const sizeKb = (info.size / 1024).toFixed(2)

console.log('产物: ' + path.relative(root, outfile))
console.log('体积: ' + info.size + ' 字节 (' + sizeKb + ' KB)')
console.log('单文件: 是')
