"""Waves, shovel, sand, a laugh, night insects, and a whoosh on each camera move. Voice stays full."""
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
VOICE = ROOT / "voice" / "voice.mp3"
OUT = ROOT / "audio" / "bed.wav"
SR = 48000
DUR = 60.40
CUTS = [4.04, 12.26, 16.98, 20.84, 28.48, 31.34, 38.16, 43.66, 51.02]


def onepole(x, cutoff, kind):
    dt = 1 / SR
    rc = 1 / (2 * np.pi * cutoff)
    a = rc / (rc + dt) if kind == "hp" else dt / (rc + dt)
    y = np.empty_like(x)
    y[0] = x[0]
    if kind == "hp":
        for i in range(1, len(x)):
            y[i] = a * (y[i - 1] + x[i] - x[i - 1])
    else:
        for i in range(1, len(x)):
            y[i] = y[i - 1] + a * (x[i] - y[i - 1])
    return y


def burst(bed, at, dur, amp, f0, f1, rng):
    i0 = int(at * SR)
    L = int(dur * SR)
    i1 = min(len(bed), i0 + L)
    if i1 <= max(i0, 0):
        return
    sl = i1 - max(i0, 0)
    tt = np.linspace(0, 1, sl)
    nse = rng.standard_normal(sl)
    freq = f0 + (f1 - f0) * tt
    tone = np.sin(2 * np.pi * np.cumsum(freq) / SR)
    env = np.sin(np.pi * tt) ** 1.2 * np.exp(-2.2 * tt)
    bed[max(i0, 0):i1] += (nse * 0.6 + tone * 0.5) * env * amp


def main():
    n = int(SR * DUR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(4)
    white = rng.standard_normal(n)
    surf = onepole(white, 900, "lp")
    surf /= np.std(surf) + 1e-9
    swell = 0.65 + 0.35 * np.sin(2 * np.pi * 0.18 * t) ** 2
    waves = surf * swell * 0.11
    # a brighter hiss of wind in the palms, quieter at night
    hiss = onepole(rng.standard_normal(n), 1400, "hp")
    hiss /= np.std(hiss) + 1e-9
    night = np.clip((t - 28.2) / 0.6, 0, 1) * np.clip((38.2 - t) / 0.6, 0, 1)
    waves += hiss * (0.035 * (1 - 0.65 * night))

    bed = waves
    # shovel bites
    for a, b in ((17.7, 20.7), (23.2, 25.6), (32.2, 37.9)):
        k = a
        while k < b:
            burst(bed, k, 0.16, 0.28, 900, 180, rng)
            k += 0.28
    # sand poured back
    i0, L = int(38.3 * SR), int(1.6 * SR)
    grain = onepole(np.abs(rng.standard_normal(L)), 2500, "hp")
    bed[i0:i0 + L] += grain / (np.max(np.abs(grain)) + 1e-9) * np.linspace(0.2, 0, L) * 0.2
    # crew laugh: three short pitched bursts
    for at, f in ((26.4, 420), (26.9, 360), (27.5, 480)):
        L = int(0.35 * SR)
        i0 = int(at * SR)
        tt = np.arange(L) / SR
        bed[i0:i0 + L] += np.sin(2 * np.pi * f * tt) * np.sin(2 * np.pi * 14 * tt) * np.exp(-4 * tt) * 0.12
    # insects at night
    bugs = np.zeros(n)
    k = 28.6
    br = np.random.default_rng(9)
    while k < 38.0:
        i0 = int(k * SR)
        L = int(0.04 * SR)
        if i0 + L < n:
            bugs[i0:i0 + L] += np.sin(2 * np.pi * (2800 + br.random() * 800) * np.arange(L) / SR) * 0.08
        k += 0.11 + br.random() * 0.18
    bed += bugs
    for at in CUTS:
        burst(bed, at - 0.04, 0.26, 0.45, 1400, 220, rng)
    # one gull over the opening wide
    i0, L = int(1.1 * SR), int(0.7 * SR)
    tt = np.arange(L) / SR
    bed[i0:i0 + L] += np.sin(2 * np.pi * (900 + 500 * tt) * tt) * np.sin(np.pi * tt) * 0.08

    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(VOICE), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
    voice = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    if len(voice) < n:
        voice = np.pad(voice, (0, n - len(voice)))
    voice = voice[:n]
    ker = np.ones(int(0.05 * SR)) / int(0.05 * SR)
    loud = np.convolve(np.abs(voice), ker, mode="same")
    bed *= 1 - 0.2 * np.clip(loud / 0.2, 0, 1)
    ax = np.abs(bed)
    over = np.maximum(0, ax - 0.16)
    bed = np.sign(bed) * (np.minimum(ax, 0.16) + 0.22 * np.tanh(over / 0.22))
    right = np.concatenate([np.zeros(14), bed[:-14]])
    stereo = np.stack([bed, right], axis=1)
    pcm = np.clip(stereo * 32767, -32767, 32767).astype(np.int16)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print("wrote", OUT)


if __name__ == "__main__":
    main()
