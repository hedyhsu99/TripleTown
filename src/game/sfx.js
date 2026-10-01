// 輕量音效模組：以 WebAudio 即時合成音效，不需外部音檔
// 所有函式在 muted 或瀏覽器不支援時靜默跳過，不影響遊戲流程

let audioCtx = null
let muted = false

// 切換靜音，回傳目前音效是否開啟
export function toggleMute() {
  muted = !muted
  return !muted
}

export function isSoundOn() {
  return !muted
}

function ctx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  // 行動瀏覽器：AudioContext 需在使用者互動後 resume
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// 播放單一音符：freq 頻率(Hz)、duration 長度(秒)
function tone(freq, duration, { type = 'triangle', gain = 0.12, delay = 0 } = {}) {
  if (muted) return
  try {
    const c = ctx()
    const t0 = c.currentTime + delay
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    g.gain.setValueAtTime(gain, t0)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
    osc.connect(g)
    g.connect(c.destination)
    osc.start(t0)
    osc.stop(t0 + duration)
  } catch {
    // 音效失敗不影響遊戲
  }
}

// 放置物件：短促低音「嗒」
export function playPlace() {
  tone(320, 0.08, { type: 'square', gain: 0.05 })
}

// 合成：上行三連琶音；連鎖（chain）越深整組音高越高，強化連鎖爽感
export function playMerge(chain = 1) {
  const base = 440 * Math.pow(1.25, Math.min(chain - 1, 4))
  tone(base,        0.12)
  tone(base * 1.25, 0.12, { delay: 0.07 })
  tone(base * 1.5,  0.18, { delay: 0.14 })
}

// 開寶箱 / 獲得金幣：兩聲清脆高音
export function playCoin() {
  tone(880,  0.09, { type: 'sine', gain: 0.10 })
  tone(1320, 0.14, { type: 'sine', gain: 0.10, delay: 0.08 })
}
