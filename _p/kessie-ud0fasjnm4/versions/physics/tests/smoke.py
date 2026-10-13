# Headless smoke test: loads the game in Edge, checks for JS errors, screenshots each zone.
# Usage: python tests\smoke.py   (needs: pip install playwright; uses installed Edge)
import pathlib, sys
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'tests' / 'shots'
out.mkdir(exist_ok=True)
url = (root / 'index.html').as_uri() + '?dev=1'
errors = []

with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 810})
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    pg.goto(url)
    pg.wait_for_selector('#loading', state='detached', timeout=15000)
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(out / '0_title.png'))
    pg.evaluate('__grip.start(true)')
    pg.wait_for_timeout(600)
    x0 = pg.evaluate('__grip.sim.b.C.x')
    pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(900); pg.keyboard.up('ArrowRight')
    pg.wait_for_timeout(300)
    x1 = pg.evaluate('__grip.sim.b.C.x')
    head = pg.evaluate('__grip.sim.b.H.y')
    print(f'walk: chest x {x0:.0f} -> {x1:.0f}, head y {head:.0f}')
    if not (x1 > x0 + 80 and head < -40): errors.append('keyboard walk failed')
    pg.screenshot(path=str(out / '1_walk.png'))
    # real mouse clicks: click the jug, then the lip, then Up to mantle
    def to_screen(x, y):
        return pg.evaluate(f'''() => {{ const R = __grip.R; return [(({x}) - R.cam.x) * R.scale / R.dpr + R.W / 2 / R.dpr, (({y}) - R.cam.y) * R.scale / R.dpr + R.H / 2 / R.dpr]; }}''')
    def click_hold(x, y, wait=1400, shot=None):
        sx, sy = to_screen(x, y)
        pg.mouse.move(sx, sy); pg.wait_for_timeout(250)
        if shot: pg.screenshot(path=str(out / shot))
        pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(wait)
    pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(500); pg.keyboard.up('ArrowRight'); pg.wait_for_timeout(300)
    click_hold(243, -69, shot='1_hover_jug.png')
    g1 = pg.evaluate('__grip.sim.hands.some(h => h.grip)')
    click_hold(249, -95, shot='1_hover_lip.png')
    g2 = pg.evaluate('!!__grip.sim.lipHeld()')
    pg.keyboard.press('ArrowUp'); pg.wait_for_timeout(3500)
    feet = pg.evaluate('__grip.sim.b.FL.y')
    print(f'click jug: {g1}, click lip: {g2}, after mantle feet y {feet:.0f}')
    if not (g1 and g2 and feet < -80): errors.append('click-to-climb first wall failed')
    pg.screenshot(path=str(out / '1_ledge.png'))
    spots = [[715, -610], [1040, -1030], [1125, -2050], [1250, -3010], [1450, -3810], [2265, -4570]]
    for i, (x, y) in enumerate(spots, start=2):
        pg.evaluate(f'''() => {{ const s = __grip.sim; s.teleport({x},{y}); __grip.R.cam.x = s.b.C.x; __grip.R.cam.y = s.b.C.y; }}''')
        pg.wait_for_timeout(1300)
        sx, sy = to_screen(x + 60, y - 120); pg.mouse.move(sx, sy); pg.wait_for_timeout(300)
        pg.screenshot(path=str(out / f'{i}_zone{i}.png'))
    info = pg.evaluate('() => ({h: __grip.sim.height(), zone: __grip.sim.zoneIndex(), hud: document.getElementById("zone").textContent})')
    print('state:', info)
    b.close()

print('errors:', errors or 'none')
sys.exit(1 if errors else 0)
