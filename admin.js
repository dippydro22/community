import { createHash, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { getSeason } from './server.js'

const digest = (value) => createHash('sha256').update(value).digest()

export async function handleAdmin(request, password = process.env.ADMIN_PASSWORD) {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Content-Type': 'text/plain; charset=utf-8' }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: {...headers, Allow:'GET, HEAD'} })
  }
  if (!password) return new Response('ADMIN_PASSWORD를 설정하면 관리자 미리보기를 사용할 수 있어요.', { status: 503, headers })
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(request.headers.get('Authorization') ?? '')
  const supplied = match ? Buffer.from(match[1], 'base64') : Buffer.alloc(0)
  if (!timingSafeEqual(digest(supplied), digest('admin:' + password))) {
    return new Response('관리자 로그인이 필요해요.', { status: 401, headers: {...headers, 'WWW-Authenticate':'Basic realm="Season Preview", charset="UTF-8"'} })
  }
  const names = { spring:'봄', summer:'여름', autumn:'가을', winter:'겨울' }
  const { season } = getSeason()
  const nav = Object.entries(names).map(([key, label]) =>
    '<button type="button" data-preview-season="' + key + '" aria-pressed="' + (key === season) + '">' + label + '</button>'
  ).join('')
  const html = (await readFile(new URL('./public/index.html', import.meta.url), 'utf8'))
    .replace('<body>', '<body data-preview="' + season + '">')
    .replace('<title>계절의 모닥불</title>', '<title>계절 미리보기 · 계절의 모닥불</title>')
    .replace('<div class="calendar" id="calendar" aria-live="polite">계절 확인 중</div>',
      '<div class="preview-tools"><a href="/">쉼터로 돌아가기</a><nav aria-label="미리 볼 계절">' + nav + '</nav></div>')
    .replace(/    <section class="chat"[\s\S]*?<\/section>/, '')
  return new Response(request.method === 'HEAD' ? null : html, { headers: {...headers, 'Content-Type':'text/html; charset=utf-8'} })
}
