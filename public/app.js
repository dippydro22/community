const $ = (selector) => document.querySelector(selector)
const seasons = {
  winter: ['❄', '겨울 쉼터', '눈 내리는 모닥불', '눈 덮인 숲에서 불을 쬐며 잠깐 쉬어가요.', '눈 덮인 소나무 숲', '모닥불 간식', '불에 올리고 알맞은 때에 꺼내보세요.', [['🍠', '군고구마', 60, 18], ['🍡', '마시멜로', 12, 5]]],
  spring: ['✿', '봄 쉼터', '벚꽃 아래 소풍', '꽃잎이 내려앉는 자리에서 돗자리를 펴요.', '벚꽃이 핀 공원', '피크닉 간식', '돗자리에서 간식을 하나 골라보세요.', [['🍓', '딸기'], ['🍙', '주먹밥']]],
  summer: ['☀', '여름 쉼터', '파도가 밀려오는 해변', '바닷바람을 맞으며 시원한 간식을 나눠요.', '햇살 가득한 모래사장', '해변 간식', '더위를 식혀 줄 간식을 골라보세요.', [['🍉', '수박'], ['🍧', '빙수']]],
  autumn: ['❧', '가을 쉼터', '낙엽 쌓인 캠핑장', '단풍 사이로 해가 지면 캠핑 의자에 앉아요.', '단풍나무 숲속 캠핑장', '캠핑 간식', '불에 올리고 알맞은 때에 꺼내보세요.', [['🌰', '군밤', 24, 10], ['🌽', '구운 옥수수', 35, 12]]]
}

const cooking = new Map()
let season = 'winter'
let foodCards = []
function selectSeason(key) {
  season = key
  const [icon, label, title, description, place, foodTitle, hint, foods] = seasons[key]
  document.documentElement.dataset.season = key
  for (const button of document.querySelectorAll('nav button')) {
    button.setAttribute('aria-pressed', String(button.dataset.season === key))
  }
  $('#season-label').textContent = icon + '　' + label
  $('#scene-title').textContent = title
  $('#scene-description').textContent = description
  $('#scene-place').textContent = place
  $('#food-title').textContent = foodTitle
  $('#food-hint').textContent = hint
  $('#chat-title').textContent = ({winter:'모닥불 옆 수다', spring:'돗자리 위 수다', summer:'해변에서 수다', autumn:'캠핑장 수다'})[key]
  foodCards = foods.map(([emoji, name, duration, grace], index) => {
    const id = key + index
    const card = document.createElement('div')
    card.className = 'food'
    card.innerHTML = '<span class="food-emoji" aria-hidden="true"></span><div><strong class="food-name"></strong><span class="food-state"></span></div><button type="button"></button>'
    card.querySelector('.food-emoji').textContent = emoji
    card.querySelector('.food-name').textContent = name
    const state = card.querySelector('.food-state')
    const button = card.querySelector('button')
    const update = () => {
      const item = cooking.get(id)
      const elapsed = item ? (Date.now() - item.started) / 1000 : 0
      if (item?.stage === 'cooking' && elapsed >= duration + grace) item.stage = 'burned'
      const stage = item?.stage ?? 'idle'
      let detail
      let action
      if (stage === 'cooking') {
        detail = elapsed < duration ? '굽는 중 · ' + Math.ceil(duration - elapsed) + '초' : '다 익었어요 · ' + Math.ceil(duration + grace - elapsed) + '초 뒤 타요'
        action = '꺼내기'
      } else if (stage === 'ready') {
        detail = '알맞게 익었어요'
        action = '먹기'
      } else {
        detail = {burned:'앗, 타버렸어요', early:'조금 더 익혀야 해요', eaten:'맛있게 먹었어요'}[stage] ?? (duration ? duration + '초 굽기' : '바로 먹을 수 있어요')
        action = duration ? (stage === 'idle' ? '굽기' : '다시 굽기') : '먹기'
      }
      if (state.textContent !== detail) state.textContent = detail
      if (button.textContent !== action) {
        button.textContent = action
        button.setAttribute('aria-label', name + ' ' + action)
      }
    }
    button.addEventListener('click', () => {
      update()
      const item = cooking.get(id)
      if (item?.stage === 'cooking') {
        item.stage = Date.now() - item.started < duration * 1000 ? 'early' : 'ready'
      } else if (!duration || item?.stage === 'ready') {
        cooking.set(id, { stage: 'eaten' })
      } else {
        cooking.set(id, { stage: 'cooking', started: Date.now() })
      }
      update()
      $('#food-feedback').textContent = name + ' · ' + state.textContent
    })
    update()
    return { card, update }
  })
  $('#foods').replaceChildren(...foodCards.map(({card}) => card))
  $('#messages').replaceChildren()
  $('#empty').hidden = false
  $('#chat-status').textContent = ''
  refreshChat()
}
for (const button of document.querySelectorAll('nav button')) {
  button.addEventListener('click', () => {
    if (button.dataset.season !== season) selectSeason(button.dataset.season)
  })
}
setInterval(() => foodCards.forEach(({update}) => update()), 200)

const nickname = $('#nickname')
try { nickname.value = localStorage.getItem('hearth-nickname') ?? '' } catch {}
const list = $('#messages')
const status = $('#chat-status')
let clockOffset = 0
let latestRequest = 0
function ageMessages() {
  const now = Date.now() + clockOffset
  for (const element of [...list.children]) {
    const remaining = Number(element.dataset.expires) - now
    if (remaining <= 0) element.remove()
    else if (remaining <= 1000) element.classList.add('fading')
  }
  $('#empty').hidden = list.children.length > 0
}
async function refreshChat() {
  const room = season
  const request = ++latestRequest
  try {
    const response = await fetch('/api/chat?room=' + room, { cache: 'no-store' })
    if (!response.ok) throw Error()
    const result = await response.json()
    if (request !== latestRequest || room !== season) return
    clockOffset = result.now - Date.now()
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 45
    const known = new Set([...list.children].map(element => element.dataset.id))
    for (const {id, name, message, created} of result.messages) {
      if (known.has(id)) continue
      const element = document.createElement('li')
      const author = document.createElement('b')
      const body = document.createElement('p')
      author.textContent = name
      body.textContent = message
      element.className = 'message'
      element.dataset.id = id
      element.dataset.expires = created + 60000
      element.append(author, body)
      list.append(element)
    }
    ageMessages()
    if (atBottom) list.scrollTop = list.scrollHeight
    if (status.dataset.connection === 'failed') {
      status.textContent = ''
      delete status.dataset.connection
    }
  } catch {
    if (request !== latestRequest) return
    status.dataset.connection = 'failed'
    status.textContent = '채팅에 연결하는 중이에요.'
  }
}
$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const input = $('#message')
  const name = nickname.value.trim()
  const message = input.value.trim()
  if (!name || !message) return
  const room = season
  const submit = event.currentTarget.querySelector('button')
  submit.disabled = true
  try {
    const response = await fetch('/api/chat?room=' + room, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,message})})
    if (!response.ok) throw Error(response.status === 429 ? '잠시 쉬었다가 다시 보내주세요.' : '메시지를 보내지 못했어요. 다시 시도해주세요.')
    try { localStorage.setItem('hearth-nickname', name) } catch {}
    if (input.value.trim() === message) input.value = ''
    status.textContent = ''
    refreshChat()
  } catch (error) {
    status.textContent = error instanceof TypeError ? '연결을 확인하고 다시 보내주세요.' : error.message
  } finally {
    submit.disabled = false
  }
})
selectSeason('winter')
setInterval(refreshChat, 1800)
setInterval(ageMessages, 120)

const scene = $('.scene')
const canvas = $('.scene canvas')
const context = canvas.getContext('2d')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
let pointerX = 0
let pointerY = 0
scene.addEventListener('pointermove', (event) => {
  if (reducedMotion.matches) return
  const bounds = scene.getBoundingClientRect()
  pointerX = (event.clientX - bounds.left) / bounds.width - .5
  pointerY = (event.clientY - bounds.top) / bounds.height - .5
  scene.style.setProperty('--x', pointerX * -16 + 'px')
  scene.style.setProperty('--y', pointerY * -12 + 'px')
})
scene.addEventListener('pointerleave', () => {
  pointerX = pointerY = 0
  scene.style.setProperty('--x', '0px')
  scene.style.setProperty('--y', '0px')
})
const particles = Array.from({length:90}, () => ({x:Math.random(), y:Math.random(), size:Math.random(), speed:Math.random()}))
function draw(time) {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const scale = Math.min(devicePixelRatio, 2)
  if (canvas.width !== Math.round(width * scale) || canvas.height !== Math.round(height * scale)) {
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
  }
  context.setTransform(scale, 0, 0, scale, 0, 0)
  context.clearRect(0, 0, width, height)
  if (!reducedMotion.matches && season === 'summer') {
    for (let wave = 0; wave < 3; wave++) {
      const phase = (time / 4700 + wave / 3) % 1
      context.beginPath()
      context.strokeStyle = 'rgba(227,251,248,' + Math.sin(phase * Math.PI) * .15 + ')'
      context.lineWidth = 1 + phase * 2
      context.moveTo(width * .18, height * (.52 + phase * .06))
      context.bezierCurveTo(width * .45, height * (.56 + phase * .1), width * .75, height * (.68 + phase * .12), width, height * (.69 + phase * .13))
      context.stroke()
    }
  }
  if (!reducedMotion.matches && season !== 'summer') {
    if (season === 'winter') {
      const glow = context.createRadialGradient(width*.52, height*.67, 0, width*.52, height*.67, width*.26)
      glow.addColorStop(0, 'rgba(255,134,40,' + (.10 + Math.sin(time/140)*.035) + ')')
      glow.addColorStop(1, '#ff780000')
      context.fillStyle = glow
      context.fillRect(0,0,width,height)
    }
    particles.forEach((particle, index) => {
      const spark = season === 'winter' && index < 28
      const depth = .4 + particle.size * 1.6
      const fall = (particle.y + time * (.000028 + particle.speed * .00005) * depth) % 1
      const rise = (particle.y + time * (.00027 + particle.speed * .0002)) % 1
      const x = (spark ? .52 + (particle.x - .5) * (.12 + rise * .24) : particle.x) * width + Math.sin(time / 600 + index) * 13 - pointerX * depth * 32
      const y = (spark ? .69 - rise * .43 : fall) * height - pointerY * depth * 24
      context.fillStyle = spark ? '#ffbc64' : ({winter:'#ebf6ff',spring:'#ffb6d2',autumn:'#f5a54f'})[season]
      context.globalAlpha = spark ? (1-rise)*.8 : .19 + particle.size*.42
      context.beginPath()
      context.ellipse(x, y, depth * (spark ? 1 : 1.6), depth * (season === 'winter' ? 1 : 2.5), time / 1200 + index, 0, Math.PI*2)
      context.fill()
    })
    context.globalAlpha = 1
  }
  requestAnimationFrame(draw)
}
requestAnimationFrame(draw)
