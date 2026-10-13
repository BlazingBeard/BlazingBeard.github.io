// GRIP level data. World units: px, y grows downward, sea level ~ y=40. 64px = 1 m.
(function (G) {
  function circ(cx, cy, r, type, tex, n = 12) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return { pts, type, tex };
  }
  function rect(x1, y1, x2, y2, type, tex) {
    return { pts: [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], type, tex };
  }

  // Mountain outline. A vertex's 3rd element sets the surface type of the edge that starts there.
  const mountain = [
    [-150, 700], [-150, 40], [250, 40, 'wet'],
    // Zone 1 — Tide Pools
    [250, -90], [420, -90], [420, -210], [500, -210], [500, -330], [460, -330], [460, -348],
    [560, -348], [560, -460], [610, -460], [610, -600],
    // Zone 2 — Boulder Garden (smooth slab, then smooth wall with crumbly flakes)
    [820, -600, 'smooth'], [1000, -1020], [1080, -1020, 'smooth'], [1080, -1400],
    // Zone 3 — Shipwreck Wall (smooth face, arch overhead)
    [1400, -1400, 'smooth'], [1400, -2000], [1050, -2000], [1050, -2040], [1200, -2040],
    // Zone 4 — The Chimney (pillar, walls alternate grippy / smooth)
    [1200, -3000], [1300, -3000], [1300, -2850, 'smooth'], [1300, -2700], [1300, -2500, 'smooth'],
    [1300, -2350], [1300, -2200, 'smooth'], [1300, -2040],
    [1400, -2040], [1400, -2200, 'smooth'], [1400, -2350], [1400, -2500, 'smooth'], [1400, -2700],
    [1400, -2850, 'smooth'],
    // Zone 5 — The Overhang (big tongue roof, then a small roof, then a seeping wall)
    [1400, -3080], [950, -3280], [950, -3330], [1400, -3360], [1400, -3500], [1250, -3560],
    [1250, -3600], [1400, -3620, 'wet'], [1400, -3800],
    // Zone 6 — Wind Ridge (rock and smooth slab sections alternate)
    [1500, -3800], [1620, -3940, 'smooth'], [1700, -4040], [1800, -4150, 'smooth'], [1880, -4250],
    [1980, -4360, 'smooth'], [2050, -4440], [2120, -4520], [2200, -4560],
    // Zone 7 — Summit Spire
    [2330, -4560, 'smooth'], [2330, -5400], [2420, -5400, 'smooth'],
    [2420, 400], [3600, 400], [3600, 700],
  ];

  const shapes = [{ pts: mountain.map(v => [v[0], v[1]]), types: mountain.map(v => v[2] || 'rock'), tex: 'auto', main: true }];

  const features = [
    rect(-3000, 400, -150, 700, 'rock', 'basalt'), // seabed
    circ(243, -55, 10, 'jug', 'basalt'),
    circ(476, -357, 10, 'jug', 'basalt'),
    // boulders wedged on the slab
    circ(850, -700, 46, 'rock', 'granite', 14),
    circ(905, -840, 42, 'rock', 'granite', 14),
    circ(950, -975, 46, 'rock', 'granite', 14),
    // crumbly flakes on the smooth wall
    rect(1058, -1110, 1081, -1096, 'crumbly', 'sandstone'),
    rect(1058, -1190, 1081, -1176, 'crumbly', 'sandstone'),
    rect(1058, -1270, 1081, -1256, 'crumbly', 'sandstone'),
    rect(1058, -1350, 1081, -1336, 'crumbly', 'sandstone'),
    // the wreck
    { pts: [[1395, -1400], [1150, -1440], [1000, -1560], [960, -1680], [1100, -1652], [1395, -1612]], type: 'metal', tex: 'rust', hull: true },
    // chimney chockstone (rest)
    rect(1300, -2618, 1342, -2600, 'jug', 'granite'),
    // overhang zone rests
    circ(1392, -3430, 9, 'jug', 'granite'),
    circ(1392, -3710, 9, 'jug', 'granite'),
    // summit spire holds
    circ(2323, -4660, 10, 'jug', 'sandstone'),
    circ(2323, -4770, 10, 'jug', 'sandstone'),
    rect(2310, -4870, 2331, -4856, 'rock', 'sandstone'),
    rect(2310, -4965, 2331, -4951, 'rock', 'sandstone'),
    rect(2308, -5055, 2331, -5041, 'crumbly', 'sandstone'),
    rect(2308, -5135, 2331, -5121, 'crumbly', 'sandstone'),
    // dyno gap — next hold 160px higher
    circ(2322, -5295, 11, 'jug', 'sandstone'),
    rect(2310, -5372, 2331, -5358, 'rock', 'sandstone'),
  ];
  for (const f of features) shapes.push({ pts: f.pts, types: f.pts.map(() => f.type), tex: f.tex, hull: !!f.hull, crumbly: f.type === 'crumbly' });

  G.LEVEL = {
    shapes,
    ropes: [
      { x: 1020, y: -1546, len: 150, kind: 'chain' },
      { x: 1160, y: -2002, len: 280, kind: 'chain' },
    ],
    spawn: { x: 60, y: 30 },
    summitY: -5400,
    summitX: [2330, 2420],
    zones: [
      { name: 'Tide Pools', top: -600, bg: 'bg_z1' },
      { name: 'Boulder Garden', top: -1400, bg: 'bg_z2' },
      { name: 'Shipwreck Wall', top: -2040, bg: 'bg_z3' },
      { name: 'The Chimney', top: -3000, bg: 'bg_z4' },
      { name: 'The Overhang', top: -3800, bg: 'bg_z5' },
      { name: 'Wind Ridge', top: -4560, bg: 'bg_z6' },
      { name: 'Summit Spire', top: -99999, bg: 'bg_z7' },
    ],
    wind: [
      { top: -4560, bottom: -3800, strength: 650 },
      { top: -99999, bottom: -4560, strength: 420 },
    ],
    water: [
      { x1: -99999, x2: -150, y: 30 },
      { x1: 2420, x2: 99999, y: 30 },
    ],
    PX_PER_M: 64,
  };
})(typeof window !== 'undefined' ? window : globalThis);
