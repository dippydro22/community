import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { loadAssets } from './assets.mjs'
const assets = await loadAssets()
const data = Object.fromEntries(Object.entries(assets).map(([path, {type, body}]) => [path, {type, base64:body.toString('base64')}]))
await mkdir('dist/server', {recursive:true})
await mkdir('dist/.openai', {recursive:true})
await cp('.openai/hosting.json', 'dist/.openai/hosting.json')
await cp('migrations', 'dist/migrations', {recursive:true})
const server = await readFile('server.js', 'utf8')
await writeFile('dist/server/index.js', server + '\nconst assets = ' + JSON.stringify(data) + ';\nfor (const asset of Object.values(assets)) asset.body = Uint8Array.from(atob(asset.base64), char => char.charCodeAt(0));\nexport default createApp(assets);\n')
