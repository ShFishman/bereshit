# בְּרֵאשִׁית — In the Beginning

A 3D browser retelling of **פרשת בראשית** (Genesis 1–3): the seven days, the loneliness of Adam, the serpent, and the gate that closed.

You do not watch the world being made. You hold a button down and it happens.

**[▶ Play it](#)** · Hebrew with optional English · headphones recommended

---

## The piece

Six acts, played straight through in about twenty-five minutes.

| | | |
|---|---|---|
| **תוהו** | Tohu | The deep, before the first word. |
| **בריאה** | Creation | Seven days. You speak each one. |
| **עדן** | Eden | You name ten animals. Every one of them arrives as a pair. |
| **חוה** | Eve | The deep sleep, and the one made out of him. |
| **נחש** | Serpent | It works on her. Then you do the working. |
| **גירוש** | Exile | The eating, the opened eyes, the curses, the gate. |

Two things the design is built around:

**The loneliness act has no fail state and no puzzle.** Ten animals walk in, you give each a name, and they walk away together. Adam's interior lines surface as the meter fills. Nothing resolves it. The verse at the end — *וּלְאָדָם לֹא־מָצָא עֵזֶר כְּנֶגְדּוֹ* — arrives having already been felt.

**The serpent scene turns around.** In the first half the player answers the serpent as Eve, choosing how much ground to give. In the second half the player chooses *Eve's* words to Adam — the same technique, now in your hands. The serpent never lies outright; it reframes. The glosses name what it is doing, coldly, like a footnote by someone who has watched this happen before.

## Built from nothing

No textures, no models, no audio files. The repository is pure text; everything you see and hear is generated at runtime.

- **Geometry** — trees grow from a recursive branch algorithm, people are posed capsule skeletons, the serpent is a tube swept along a live spline, animals are built from a parametric species table.
- **Shaders** — ten hand-written GLSL programs (`src/gfx/shaders.js`): the churning void, a sky that moves from dawn to starfield, Gerstner-wave water, a procedural garden floor that can be bleached on a dial, bark with something awake inside it, the dust that becomes a man, the presence, the turning sword.
- **Score** — ~2,000 lines of Web Audio (`src/audio/score.js`). The seven days are an arc from noise into harmony: `tohu` has no pitch at all, and each day pulls one more layer out of it. Eden sits in Ahava Rabbah, the Jewish liturgical mode. `exile` is the Eden theme transposed down and filtered, as if heard from outside a wall.
- **Text** — the Masoretic text of Bereshit 1–3 with nikud, a literary English translation, and original narration kept in a visibly separate voice from scripture (`src/content/script.js`).

## Running it locally

No build step and no dependencies — it is ES modules and an import map.

```bash
git clone https://github.com/ShFishman/bereshit.git
cd bereshit
npm start            # http://localhost:8123
```

Any static server works; `python -m http.server` is fine too. Opening `index.html` as a `file://` URL is not, because ES modules need a real origin.

## Controls

| | |
|---|---|
| **Click / Space** | advance, and hold to speak a day into being |
| **♪** or `M` | sound |
| **A** or `L` | English translation |
| **☰** or `Esc` | chapters |
| **⤢** or `F` | fullscreen |

The piece auto-scales its resolution if frames get expensive, and drops particle and foliage counts on mobile.

## Layout

```
index.html            import map, overlay markup
styles.css            RTL Hebrew typography, the whole UI chrome
src/
  main.js             boot, act sequencing, chapter jumps
  core/
    engine.js         renderer, camera rig, bloom, the veil, frame loop
    stage.js          the one world — built across the days, then lived in and lost
    ui.js             verses, narration, dialogue, choices, prompts
    materials.js      binds the shader library to THREE materials
    utils.js          clock, tweens, easing, seeded RNG
  acts/               one file per act, written like a screenplay
  gfx/                shaders, flora, fauna, figures, particles, world
  audio/score.js      the procedural score
  content/script.js   every word, Hebrew and English
```

The world is created once and never rebuilt. The garden you make on the third day is the garden you are thrown out of.

## A note on the text

The Tetragrammaton is written `ה׳` on screen, the customary substitution. Verses are quoted; the narration around them is not scripture and does not imitate its cadence.

## Licence

MIT — see [LICENSE](LICENSE).
