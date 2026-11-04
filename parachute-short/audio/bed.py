"""Sound bed under the parachute voice: high wind, sub rumble, cut whooshes, city as the ground gets close.
Voice stays at full level. The bed is ducked a little while words are loud.
"""
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
VOICE = ROOT / "voice" / "voice.mp3"
OUT = ROOT / "audio" / "bed.wav"
SR = 48000
DUR = 69.72
# Visual cuts, about 2 frames before the stressed word.
CUTS = [5.39, 8.67, 14.99, 18.13, 22.29, 25.89, 30.15, 40.55, 44.89, 48.57, 56.29, 60.57]


def onepole(x: np.ndarray, cutoff: float, kind: str) -> np.ndarray:
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


def main() -> None:
    n = int(SR * DUR)
    t = np.arange(n, dtype=np.float64) / SR
    rng = np.random.default_rng(11)
    white = rng.standard_normal(n).astype(np.float64)

    wind_n = onepole(onepole(white, 900, "hp"), 900, "hp")
    wind_n /= np.std(wind_n) + 1e-9
    whistle_f = 2100 + 520 * np.sin(2 * np.pi * 0.17 * t) + 180 * np.sin(2 * np.pi * 0.05 * t)
    whistle = np.sin(2 * np.pi * np.cumsum(whistle_f) / SR) * 0.22
    whistle += np.sin(2 * np.pi * np.cumsum(whistle_f * 1.5) / SR) * 0.06
    alt = np.clip(1.05 - t / 80, 0.42, 1)
    gust = 0.72 + 0.28 * np.sin(2 * np.pi * 0.37 * t) * np.sin(2 * np.pi * 0.11 * t)
    wind = (wind_n * 0.55 + whistle) * alt * gust * 0.14

    sub = np.sin(2 * np.pi * 46 * t) * 0.65 + np.sin(2 * np.pi * 61 * t + 0.6) * 0.35
    env = np.full(n, 0.18)
    for center, width, gain in ((1.05, 0.9, 0.85), (27.4, 1.15, 1.0), (36.3, 0.9, 0.7), (56.5, 0.55, 0.8), (59.3, 1.0, 0.9)):
        env += gain * np.exp(-0.5 * ((t - center) / width) ** 2)
    sub *= np.clip(env, 0, 1.3) * 0.16

    city_n = onepole(rng.standard_normal(n), 700, "lp")
    city_n /= np.std(city_n) + 1e-9
    close = np.clip((t - 26) / 12, 0, 1) * np.clip((64 - t) / 6, 0.35, 1)
    traffic = (np.sin(2 * np.pi * 90 * t) + 0.4 * np.sin(2 * np.pi * 140 * t)) * 0.15
    car = np.clip((t - 44.9) / 0.3, 0, 1) * np.clip((48.7 - t) / 0.35, 0, 1)
    engine = (np.sin(2 * np.pi * 74 * t) + 0.55 * np.sin(2 * np.pi * 148 * t)) * 0.28 * car
    city = (city_n * 0.35 + traffic) * close * 0.16 + engine * 0.32

    bed = wind + sub + city
    for at in CUTS:
        L = int(0.32 * SR)
        i0 = int(at * SR)
        i1 = min(n, i0 + L)
        if i1 <= i0:
            continue
        tt = np.linspace(0, 1, i1 - i0)
        burst_n = rng.standard_normal(i1 - i0)
        freq = 1600 + (240 - 1600) * tt
        tone = np.sin(2 * np.pi * np.cumsum(freq) / SR)
        env_w = np.sin(np.pi * tt) ** 1.1 * np.exp(-2.4 * tt)
        bed[i0:i1] += (burst_n * 0.65 + tone * 0.55) * env_w * 1.05

    # Reserve opening: a low thump on "cuts".
    i0 = int(56.45 * SR)
    L = int(0.45 * SR)
    tt = np.arange(L) / SR
    bed[i0:i0 + L] += (np.sin(2 * np.pi * 78 * tt) * np.exp(-7 * tt) + rng.standard_normal(L) * np.exp(-16 * tt)) * 0.85

    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(VOICE), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
    voice = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    if len(voice) < n:
        voice = np.pad(voice, (0, n - len(voice)))
    voice = voice[:n]
    kernel = np.ones(int(0.04 * SR)) / int(0.04 * SR)
    loud = np.convolve(np.abs(voice), kernel, mode="same")
    duck = 1 - 0.22 * np.clip(loud / 0.18, 0, 1)
    bed *= duck
    ax = np.abs(bed)
    over = np.maximum(0, ax - 0.2)
    bed = np.sign(bed) * (np.minimum(ax, 0.2) + 0.28 * np.tanh(over / 0.28))
    right = np.concatenate([np.zeros(18), bed[:-18]])
    stereo = np.stack([bed, right * 0.92], axis=1)
    pcm = np.clip(stereo, -1, 1)
    pcm = (pcm * 32767).astype(np.int16)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "w") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", OUT, "peak", float(np.max(np.abs(pcm)) / 32767))


if __name__ == "__main__":
    main()
