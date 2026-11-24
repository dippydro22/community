import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp'}
export async function loadAssets(directory = 'public', prefix = '') {
  const entries = await readdir(directory, {withFileTypes:true})
  const assets = {}
  for (const entry of entries) {
    const path = join(directory, entry.name)
    const route = prefix + '/' + entry.name
    if (entry.isDirectory()) Object.assign(assets, await loadAssets(path, route))
    else if (types[extname(entry.name)]) assets[route] = {type:types[extname(entry.name)], body:await readFile(path)}
  }
  return assets
}
