import { createSeasonScene } from './scene.js'

const $ = (selector) => document.querySelector(selector)
const seasons = {
  winter: ['❄', '겨울 쉼터', '눈 내리는 모닥불', '눈 덮인 숲에서 불을 쬐며 잠깐 쉬어가요.', '눈 덮인 소나무 숲', '모닥불 간식', '불에 올리고 알맞은 때에 꺼내보세요.', [['🍠', '군고구마', 60, 18], ['🍡', '마시멜로', 12, 5]]],
  spring: ['✿', '봄 쉼터', '벚꽃 아래 소풍', '꽃잎이 내려앉는 자리에서 돗자리를 펴요.', '벚꽃이 핀 공원', '피크닉 간식', '돗자리에서 간식을 하나 골라보세요.', [['🍓', '딸기'], ['🍙', '주먹밥']]],
  summer: ['☀', '여름 쉼터', '파도가 밀려오는 해변', '바닷바람을 맞으며 시원한 간식을 나눠요.', '햇살 가득한 모래사장', '해변 간식', '더위를 식혀 줄 간식을 골라보세요.', [['🍉', '수박'], ['🍧', '빙수']]],
  autumn: ['❧', '가을 쉼터', '낙엽 쌓인 캠핑장', '단풍 사이로 해가 지면 캠핑 의자에 앉아요.', '단풍나무 숲속 캠핑장', '캠핑 간식', '불에 올리고 알맞은 때에 꺼내보세요.', [['🌰', '군밤', 24, 10], ['🌽', '구운 옥수수', 35, 12]]]
}

const cooking = new Map()
const scene = createSeasonScene($('.scene'))
let season
let seasonTimer
let foodCards = []
function selectSeason(key) {
  season = key
  scene.setSeason(key)
  const [icon, label, title, description, place, foodTitle, hint, foods] = seasons[key]
  document.documentElement.dataset.season = key
  $('#season-label').textContent = icon + '　' + label
  $('#scene-title').textContent = title
  $('#scene-description').textContent = description
  $('#season-label').hidden = false
  $('#calendar').textContent = ({winter:'겨울', spring:'봄', summer:'여름', autumn:'가을'})[key] + ' · 한국 시간'
  $('#scene-place').textContent = place + ' · 드래그해서 둘러보기'
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
      scene.setFood(index, { stage, progress: duration ? elapsed / duration : 0 })
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
  $('#chat-form button').disabled = false
}
setInterval(() => foodCards.forEach(({update}) => update()), 200)

const nickname = $('#nickname')
try { nickname.value = localStorage.getItem('hearth-nickname') ?? '' } catch {}
const list = $('#messages')
const status = $('#chat-status')
let clockOffset = 0
let newestServerTime = 0
let latestRequest = 0
function applySeason(state) {
  if (state.now < newestServerTime) return false
  newestServerTime = state.now
  if (state.season !== season && Object.hasOwn(seasons, state.season)) selectSeason(state.season)
  clockOffset = state.now - Date.now()
  clearTimeout(seasonTimer)
  seasonTimer = setTimeout(syncSeason, Math.max(1000, Math.min(60000, state.nextChange - state.now + 80)))
  return true
}
async function syncSeason() {
  try {
    const response = await fetch('/api/season', { cache: 'no-store' })
    if (!response.ok) throw Error()
    const state = await response.json()
    const changed = state.season !== season
    applySeason(state)
    if (changed) refreshChat()
  } catch {
    if (!season) $('#calendar').textContent = '계절을 다시 확인하는 중'
    seasonTimer = setTimeout(syncSeason, 5000)
  }
}
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
  if (!season) return
  const request = ++latestRequest
  try {
    const response = await fetch('/api/chat', { cache: 'no-store' })
    const result = await response.json()
    if (request !== latestRequest) return
    if (!response.ok) {
      if (result.season) applySeason(result)
      throw Error()
    }
    if (result.season !== season && !applySeason(result)) return
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
  if (!name || !message || !season) return
  const room = season
  const submit = event.currentTarget.querySelector('button')
  submit.disabled = true
  try {
    const response = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,message,season:room})})
    if (response.status === 409) {
      applySeason(await response.json())
      refreshChat()
      throw Error('계절이 바뀌었어요. 새 쉼터에 다시 보내주세요.')
    }
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
syncSeason()
setInterval(() => {
  if (!document.hidden) refreshChat()
}, 2400)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshChat()
})
setInterval(ageMessages, 120)
