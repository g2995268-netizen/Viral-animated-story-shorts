# Mix for the Nike short: voice untouched, original march ducked under it, SFX about 6 dB lower.
# Output is 48 kHz stereo, the same length as the picture (2243 frames), about -14 LUFS.
import json
import os
import numpy as np
from dsp import SR, ns, dbg, st, pan, fades, colored, lp, hp, rng, integrated, true_peak, read_wav, write_wav, momentary_max
import instruments as I

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DUR = 2243 / 30
N = ns(DUR)
VOICE = os.path.join(ROOT, "voice", "voice.wav")
WORDS = os.path.join(ROOT, "voice", "words.json")


def put(buf, x, t, gain=1.0):
    x = st(x) * gain
    i = max(0, ns(t))
    n = min(x.shape[1], buf.shape[1] - i)
    if n > 0:
        buf[:, i:i + n] += x[:, :n]


def music():
    r = rng(2002)
    buf = np.zeros((2, N))
    # original 8-beat phrase in C, not the bridge theme. Quarter = 0.5 s.
    phrase = [(0, 0.42, 72), (0.5, 0.4, 76), (1.0, 0.42, 79), (1.5, 0.7, 76),
              (2.5, 0.4, 74), (3.0, 0.42, 72), (3.5, 0.85, 67)]
    bass = [36, 43, 41, 43]
    sections = [(0.0, 8.2, 0), (11.4, 18.4, 0), (18.5, 28.2, 5), (32.4, 38.4, -5),
                (38.6, 49.8, 0), (56.6, 66.6, 0), (67.1, DUR - 0.2, 7)]
    for a, b, tr in sections:
        t = a
        bar = 0
        while t < b - 0.2:
            for dt, dur, m in phrase:
                tt = t + dt
                if tt >= b:
                    continue
                note = I.fife(I.m2f(m + tr), dur, 0.55, r)
                put(buf, note, tt, 0.22)
                if m % 2 == 0:
                    put(buf, I.pluck(I.m2f(m + tr - 12), 0.35, r, dur=0.6), tt, 0.12)
            for k in range(8):
                tt = t + k * 0.5
                if tt >= b:
                    break
                f = I.m2f(bass[(bar + k) % 4] + (tr // 2))
                put(buf, I.brass(f, 0.42, 0.5, r, kind="tuba"), tt, 0.16)
                if k % 2 == 1:
                    put(buf, I.snare(0.35, r), tt, 0.08)
            t += 4.0
            bar += 1
    # win sting and the missile hit
    put(buf, I.glock(I.m2f(84), 0.8, r), 31.02, 0.35)
    put(buf, I.glock(I.m2f(88), 0.9, r), 31.22, 0.28)
    put(buf, I.timpani(I.m2f(36), 0.9, r, dur=1.6), 34.82, 0.55)
    put(buf, I.brass(I.m2f(48), 1.2, 0.7, r), 34.86, 0.2)
    for t, vel in I.snare_roll(55.1, 56.7, 0.25, 0.75, r, rate=18):
        put(buf, I.snare(vel, r, dur=0.12), t, 0.12)
    return fades(lp(buf, 8000), 0.05, 0.4)


def sfx():
    r = rng(74)
    buf = np.zeros((2, N))
    air = fades(st(lp(colored(N, r, 0.7), 900)) * 0.015, 0.3, 0.4)
    buf += air
    def whoosh(t, p=0.0):
        n = ns(0.35)
        x = colored(n, rng(int(t * 1000) + 3), -0.2)
        env = np.linspace(0, 1, n) ** 2 * np.linspace(1, 0, n)
        put(buf, hp(x * env, 300), t, 0.35)
    for t in (4.1, 11.5, 18.5, 28.2, 32.0, 38.6, 44.7, 50.2, 56.7, 59.0, 62.1, 67.2):
        whoosh(t)
    # mouse ticks while he browses
    for t in np.arange(13.4, 18.0, 0.55):
        put(buf, I.glock(1800, 0.25, r, dur=0.08), float(t), 0.04)
    # coins / win
    for k, f in enumerate((988, 1318, 1568)):
        put(buf, I.glock(f, 0.6, r, dur=0.25), 30.95 + k * 0.07, 0.2)
    # metal groan as the crate turns out to be a missile
    n = ns(1.1)
    groan = np.sin(2 * np.pi * np.linspace(90, 48, n) * np.arange(n) / SR)
    groan *= np.linspace(1, 0, n) ** 1.4
    put(buf, groan, 34.75, 0.22)
    # car arrival
    n = ns(1.3)
    eng = lp(colored(n, rng(9), 0.4), 180) * np.linspace(0.2, 1, n)
    put(buf, eng, 59.4, 0.5)
    # stamp
    put(buf, I.timpani(140, 0.5, r, dur=0.25), 57.5, 0.25)
    # truck pulls away
    n = ns(4.2)
    truck = lp(colored(n, rng(12), 0.6), 220) * np.linspace(0.4, 1, n)
    put(buf, truck, 62.2, 0.28)
    return fades(buf, 0.05, 0.2)


def duck_envelope(words):
    env = np.ones(N)
    for w in words:
        a = max(0, ns(float(w["s"]) - 0.06))
        b = min(N, ns(float(w["e"]) + 0.12))
        env[a:b] = 0.0
    # 80 ms attack into speech, 350 ms release after
    att, rel = ns(0.08), ns(0.35)
    out = np.zeros(N)
    level = 1.0
    for i in range(N):
        target = env[i]
        level += (target - level) * (1 / att if target < level else 1 / rel)
        out[i] = level
    # speech: -11 dB, gaps: -5 dB, both relative to the scaled music
    return dbg(-5) * (dbg(-6) + (1 - dbg(-6)) * out)


def main():
    v, sr = read_wav(VOICE)
    assert sr == SR
    voice = np.zeros((2, N))
    mono = v[0] if v.shape[0] == 1 else v.mean(0)
    voice[0, :min(N, len(mono))] = mono[:N]
    voice[1] = voice[0]
    words = json.load(open(WORDS))
    mus = music() * duck_envelope(words)
    fx = sfx()
    v_i = integrated(voice)
    mus = mus * dbg((v_i - 10.5) - integrated(mus))
    # events sit about 6 dB under the voice's loudest moment
    fx = fx * dbg((momentary_max(voice) - 8) - momentary_max(fx))
    mix = voice + mus + fx
    # soft ceiling then set integrated loudness
    ceil = dbg(-1.1)
    mix = np.tanh(mix / ceil) * ceil
    mix = mix * dbg(-14.0 - integrated(mix))
    peak = true_peak(mix)
    if peak > -1.0:
        mix *= dbg(-1.05 - peak)
    out = os.path.join(ROOT, "audio", "mix.wav")
    write_wav(out, mix, 24)
    print(f"mix {out}  integrated {integrated(mix):.2f} LUFS  true peak {true_peak(mix):.2f} dBTP  dur {DUR:.3f}s")


if __name__ == "__main__":
    main()
