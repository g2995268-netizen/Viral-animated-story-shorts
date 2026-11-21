#!/usr/bin/env python3
"""Soft tense bed under the bunker voice. Voice stays put. Music sits under it, SFX softer still.
Output: public/bunker/mix.wav at 48 kHz, same length as the voice."""
import math
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
VOICE = ROOT / "public/bunker/voice.mp3"
OUT = ROOT / "public/bunker/mix.wav"
SR = 48000


def load_voice():
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(VOICE), "-ac", "1", "-ar", str(SR), "-f", "f32le", "pipe:1"])
    return np.frombuffer(raw, dtype=np.float32).copy()


def env(n, a=0.02, b=0.05):
    x = np.ones(n, dtype=np.float32)
    na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na, dtype=np.float32)
    if nb: x[-nb:] *= np.linspace(1, 0, nb, dtype=np.float32)
    return x


def noise(n, seed):
    rng = np.random.default_rng(seed)
    return rng.standard_normal(n).astype(np.float32)


def lp(x, cut):
    # one-pole lowpass, cut in Hz
    a = math.exp(-2 * math.pi * cut / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def place(buf, t, x, gain=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    a, b = max(0, i), min(len(buf), i + len(x))
    buf[a:b] += x[a - i:b - i] * gain


def main():
    voice = load_voice()
    n = len(voice)
    t = np.arange(n, dtype=np.float32) / SR
    music = np.zeros(n, dtype=np.float32)
    sfx = np.zeros(n, dtype=np.float32)

    # minor drone, slow and soft. Opens up (brighter fifth) on the street, then sinks again.
    street0, street1 = 86.5, 96.0
    for f, g in ((73.4, 0.08), (110.0, 0.05), (146.8, 0.035), (220.0, 0.02)):
        music += g * np.sin(2 * math.pi * f * t)
    bright = np.clip((t - street0) / 2, 0, 1) * np.clip((street1 - t) / 2, 0, 1)
    music += bright * 0.04 * np.sin(2 * math.pi * 293.7 * t)
    # very slow tremolo, never a march
    music *= (0.85 + 0.15 * np.sin(2 * math.pi * 0.13 * t)).astype(np.float32)
    music = lp(music, 900) * env(n, 0.4, 0.6)

    # room tone inside, city wash outside
    room = lp(noise(n, 3), 400) * 0.035
    room *= np.clip(1 - bright * 1.4, 0.15, 1)
    city = lp(noise(n, 7), 700) * 0.05 * bright
    sfx += room + city

    # muffled siren, opening only
    siren_n = int(9 * SR)
    sw = 520 + 80 * np.sin(2 * math.pi * 0.35 * t[:siren_n])
    phase = np.cumsum(sw) / SR * 2 * math.pi
    siren = np.sin(phase).astype(np.float32)
    sfx[:siren_n] += lp(siren, 650) * 0.03 * env(siren_n, 0.3, 1.2)

    # soft heartbeat, quicker as the lock closes in, gone on the street, back for the last twist
    tt = 0.4
    while tt < n / SR - 0.2:
        if 84 < tt < 98:
            tt += 0.7
            continue
        rate = 0.85
        if tt > 55: rate = 0.62
        if tt > 64: rate = 0.48
        if tt > 100: rate = 0.7
        th = int(0.18 * SR)
        hit = np.exp(-np.linspace(0, 8, th)).astype(np.float32) * np.sin(2 * math.pi * 48 * np.arange(th) / SR)
        place(sfx, tt, hit, 0.12)
        tt += rate

    # UI tones on the announcements (shot-list beats, close enough to land under the lines)
    def beep(at, f=880, dur=0.12, g=0.05):
        m = int(dur * SR)
        w = np.sin(2 * math.pi * f * np.arange(m) / SR).astype(np.float32) * env(m, 0.005, 0.04)
        place(sfx, at, w, g)

    for at in (6.8, 12.76, 33.16, 38.2, 72.68, 105.9, 111.1):
        beep(at, 740 if at < 90 else 620, 0.14, 0.04)
    beep(53.54, 420, 0.32, 0.05)  # access denied
    for i, at in enumerate((76.15, 76.68, 77.7)):
        beep(at, 640 - i * 50, 0.08, 0.045)

    # door, shove, hatch, button
    def thud(at, g=0.18, f=70):
        m = int(0.35 * SR)
        w = np.exp(-np.linspace(0, 10, m)).astype(np.float32) * np.sin(2 * math.pi * f * np.arange(m) / SR)
        place(sfx, at, w, g)

    thud(4.3, 0.14, 55)    # door seals
    thud(63.4, 0.16, 62)   # guards grab
    # hatch whoosh
    m = int(1.1 * SR)
    who = lp(noise(m, 11), 900) * np.linspace(0.2, 1, m, dtype=np.float32) * env(m, 0.05, 0.4)
    place(sfx, 79.0, who, 0.06)
    thud(102.4, 0.07, 160)  # button

    # murmur: quiet band-passed chatter while the hall is full
    mur = lp(noise(n, 5), 1800) - lp(noise(n, 5), 280)
    mur *= (0.4 + 0.6 * np.abs(np.sin(2 * math.pi * 1.7 * t))) * 0.012
    hall = ((t < 78) | (t > 98)).astype(np.float32)
    sfx += mur * hall

    # duck music and sfx while the voice is up, so the bed stays under the words
    frame = int(0.03 * SR)
    rms = np.sqrt(np.convolve(voice ** 2, np.ones(frame) / frame, mode="same") + 1e-8)
    duck = np.clip(rms * 8, 0, 1).astype(np.float32)
    music *= 0.55 - 0.28 * duck
    sfx *= 0.85 - 0.35 * duck

    mix = voice * 1.0 + music * 0.9 + sfx
    # gentle safety, then ffmpeg loudnorm to about -14 LUFS
    peak = np.max(np.abs(mix)) + 1e-6
    if peak > 0.95: mix *= 0.95 / peak
    raw = mix.astype(np.float32).tobytes()
    tmp = OUT.with_suffix(".raw.wav")
    with wave.open(str(tmp), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        pcm = np.clip(mix, -1, 1)
        w.writeframes((pcm * 32767).astype(np.int16).tobytes())
    subprocess.check_call([
        "ffmpeg", "-y", "-v", "error", "-i", str(tmp),
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-c:a", "pcm_s16le", str(OUT),
    ])
    tmp.unlink(missing_ok=True)
    print("wrote", OUT, "frames", n)


if __name__ == "__main__":
    main()
