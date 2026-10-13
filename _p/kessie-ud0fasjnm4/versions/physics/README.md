# Kessie Klimber — HowardAI · *I want that*

A hard-but-fair physics climbing game in the spirit of *A Difficult Game About Climbing*.
Help Kessie up an 84 m sea cliff: two hands, no ropes. Every fall is hers to keep.

## Play
Open `index.html` in Edge or Chrome (works straight from disk, no server or build step).

| Input | Action |
|---|---|
| **Click a hold** | Kessie reaches for it with the best free hand and hauls herself into position |
| Right-click | let go with the hand nearest the cursor |
| ← → / A D | walk — or, while hanging, swing |
| Space | lunge (dyno) at the hold under the cursor; hop if none |
| ↑ / W | mantle when holding a ledge lip (or click the lip again); otherwise pull in / hop |
| ↓ / S | drop |
| R | back to your last ledge (checkpoint) |
| `Esc` / `P` | pause (fall assist, sound, restart) |

Holds glow **teal** when in reach and show a **dashed amber** ring when too far — swing and lunge for those. Every ledge you stand on is a checkpoint; with *fall assist* on (default) a big fall returns you there.

A new climb coaches you up the first wall step by step. Progress autosaves to `localStorage` every 2 s; *Continue* resumes exactly where you hung.

### Surfaces
| Look | Rule |
|---|---|
| Granite / basalt | normal grip drain |
| Teal glossy edge | smooth — slides, can't be held on steep faces |
| Amber ring | jug — regenerates grip |
| Cracked flake | crumbles ~1.6 s after you load it, respawns in 6 s |
| Rusty hull | metal — drains faster |
| Wet (drips) | drains 2.2× |
| Chains | swinging, grabbable anywhere |

Two hands drain slower; standing on a ledge restores grip. Wind on the ridge gusts every 7 s with a 2 s warning. Fall in the sea and the tide washes you back to the beach.

### Zones
1 Tide Pools · 2 Boulder Garden · 3 Shipwreck Wall · 4 The Chimney · 5 The Overhang · 6 Wind Ridge · 7 Summit Spire

## Dev
- `index.html?dev=1` → keys `1`–`7` teleport to zone starts, `G` toggles debug overlay, `window.__grip` exposed.
- Physics tests: `node tests\sim_test.js` — includes a route-planning bot (`tests\route_bot.js`) that climbs beach → summit using only player actions, proving the whole cliff is climbable.
- Browser smoke test + screenshots (`tests\shots\`): `pip install playwright` then `python tests\smoke.py`

## Art (ComfyUI)
All art is generated locally on ComfyUI (Krea 2 Turbo, 8 steps) at `http://192.168.1.56:8188`.
Prompts live in `tools\art.json`.

```
python tools\gen_art.py                 # generate missing assets
python tools\gen_art.py bg_z3 --force   # regenerate one
```

## Layout
```
index.html        UI shell + HUD
src/level.js      cliff geometry, holds, ropes, zones, wind
src/sim.js        120 Hz verlet body, grip/stamina rules
src/render.js     canvas renderer (textured terrain, climber, hair, particles)
src/audio.js      procedural WebAudio (waves, wind, grunts, clinks)
src/main.js       loop, input, save, screens
assets/           ComfyUI-generated backgrounds, textures, title art
```
