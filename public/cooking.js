export function cookingState(item, duration, grace, now) {
  const elapsed = (item?.elapsed ?? 0) + (item?.stage === 'cooking' ? (now - item.started) / 1000 : 0)
  const stage = item?.stage === 'cooking' && elapsed >= duration + grace ? 'burned' : item?.stage ?? 'idle'
  return { stage, elapsed, progress: duration ? Math.min(1, elapsed / duration) : 0 }
}

export function cookAction(item, duration, grace, now) {
  const { stage, elapsed } = cookingState(item, duration, grace, now)
  if (stage === 'cooking') return { stage: elapsed < duration ? 'paused' : 'ready', elapsed }
  if (!duration || stage === 'ready') return { stage: 'eaten' }
  return { stage: 'cooking', started: now, elapsed: stage === 'paused' ? elapsed : 0 }
}
