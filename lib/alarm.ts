'use client';

// =============================================
// Web Audio API — Alarm Suara Peringatan Banjir
// =============================================

let audioCtx: AudioContext | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// Buat satu nada beep
function beep(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number = 0.4,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.linearRampToValueAtTime(0, startTime + duration - 0.01);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Pola alarm berdasarkan status
function playAlarmPattern(status: 'siaga' | 'bahaya' | 'kritis') {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;

  if (status === 'siaga') {
    // Dua nada naik — peringatan ringan
    beep(ctx, 440, now, 0.3, 0.3);
    beep(ctx, 550, now + 0.35, 0.3, 0.3);
  } else if (status === 'bahaya') {
    // Tiga nada cepat naik-turun
    beep(ctx, 600, now, 0.25, 0.4, 'square');
    beep(ctx, 800, now + 0.28, 0.25, 0.4, 'square');
    beep(ctx, 600, now + 0.56, 0.25, 0.4, 'square');
  } else {
    // Kritis — pola sirene: sweep naik-turun berulang
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.5;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(900, t + 0.4);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.5);
    }
  }
}

// Mulai alarm berulang
export function startAlarm(status: 'siaga' | 'bahaya' | 'kritis') {
  stopAlarm(); // hentikan yang lama dulu
  playAlarmPattern(status);
  const interval = status === 'kritis' ? 3000 : status === 'bahaya' ? 5000 : 8000;
  alarmInterval = setInterval(() => playAlarmPattern(status), interval);
}

// Hentikan alarm
export function stopAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

// Play sekali saat notifikasi muncul (tidak berulang)
export function playNotificationSound(status: 'siaga' | 'bahaya' | 'kritis' | 'aman') {
  if (status === 'aman') {
    // Nada positif singkat
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      beep(ctx, 523, now, 0.15, 0.2);       // C5
      beep(ctx, 659, now + 0.17, 0.15, 0.2); // E5
      beep(ctx, 784, now + 0.34, 0.2, 0.25); // G5
    } catch {}
    return;
  }
  try {
    playAlarmPattern(status);
  } catch {}
}
