// PacPilot Guidance — uses live map getter via Object.defineProperty
(function () {
    var enabled = true;
    var pp = null;
    var guidedDots = {};

    document.addEventListener('keydown', function (e) {
        if (e.key === 'g' || e.key === 'G') {
            enabled = !enabled;
            guidedDots = {};
        }
    });

    function computeGuidance() {
        if (!pp || !pp.map || !pp.pacman || !pp.pacman.tile) return {};
        var m = pp.map;
        var sx = pp.pacman.tile.x, sy = pp.pacman.tile.y;
        if (sx == null || sy == null) return {};

        var cols = m.numCols, rows = m.numRows;
        var visited = {}, parent = {};
        var startKey = sx + ',' + sy;
        visited[startKey] = true;
        parent[startKey] = null;
        var queue = [{x: sx, y: sy}];
        var dx = [0, 1, 0, -1], dy = [-1, 0, 1, 0];
        var foundKey = null;

        outer: while (queue.length > 0) {
            var cur = queue.shift();
            for (var i = 0; i < 4; i++) {
                var nx = cur.x + dx[i], ny = cur.y + dy[i];
                if (nx < 0) nx = cols - 1;
                if (nx >= cols) nx = 0;
                if (ny < 0 || ny >= rows) continue;
                var nk = nx + ',' + ny;
                if (visited[nk]) continue;
                if (!m.isFloorTile(nx, ny)) continue;
                visited[nk] = true;
                parent[nk] = cur.x + ',' + cur.y;
                var t = m.getTile(nx, ny);
                if (t === '.' || t === 'o') { foundKey = nk; break outer; }
                queue.push({x: nx, y: ny});
            }
        }

        if (!foundKey) return {};
        var path = [], c = foundKey;
        while (c !== startKey && c != null) { path.unshift(c); c = parent[c]; }

        var result = {}, count = 0;
        for (var j = 0; j < path.length && count < 3; j++) {
            var p2 = path[j].split(',');
            var tile = m.getTile(+p2[0], +p2[1]);
            if (tile === '.' || tile === 'o') { result[path[j]] = true; count++; }
        }
        return result;
    }

    function drawOverlay() {
        if (!enabled) return;
        var ctx = pp.ctx;
        var ts = pp.tileSize, mt = pp.midTile;

        for (var key in guidedDots) {
            var p = key.split(',');
            var x = +p[0] * ts + mt.x;
            var y = +p[1] * ts + mt.y;
            ctx.save();
            ctx.shadowColor = '#00FF44';
            ctx.shadowBlur = ts;
            ctx.fillStyle = '#00FF44';
            ctx.beginPath();
            ctx.arc(x, y, ts * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function patchEndFrame(rnd) {
        if (!rnd || rnd._ppPatched) return;
        rnd._ppPatched = true;
        var orig = rnd.endFrame;
        rnd.endFrame = function () {
            try { drawOverlay(); } catch (e) {}
            orig.call(this);
        };
        console.log('[PacPilot] patched renderer');
    }

    function tick() {
        guidedDots = computeGuidance();
        setTimeout(tick, 80);
    }

    function init() {
        pp = window._pp;
        if (!pp) { setTimeout(init, 200); return; }
        patchEndFrame(pp.renderer);
        setInterval(function () {
            var rnd = pp.renderer;
            if (rnd && !rnd._ppPatched) patchEndFrame(rnd);
        }, 300);
        tick();
        document.title = 'PacPilot [G=guide]';
        console.log('[PacPilot] ready. map=' + (pp.map ? 'OK' : 'NULL'));
    }

    window.addEventListener('load', function () { setTimeout(init, 800); });
})();