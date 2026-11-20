// SPDX-License-Identifier: MIT
// Antigravity CLI (agy) + Three.js studio: prepares ~/threejs-games with a
// local self-contained Three.js ES module, an AGENTS.md tailored for zero-build
// unkernel previews, a playable 3D starter game (only written when index.html
// does not exist yet), a lightweight Python HTTP server on 127.0.0.1:8000 with
// proper JS MIME types and no-store caching, and launches agy (installing it
// into ~/.local/bin on first use).
import type { Demo } from "../launcher.ts";

const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";
const THREE_ADDONS_CDN = "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/";

const SERVE_PY = `#!/usr/bin/env python3
"""Lightweight static HTTP server for Three.js previews in unkernel."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class GameHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".htm": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".wasm": "application/wasm",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".wav": "audio/wav",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):
        pass


class ReusableServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    server = ReusableServer(("127.0.0.1", PORT), GameHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
`;

const AGENTS_MD = `# Three.js Game Studio (unkernel + agy)

Estás trabajando dentro de **unkernel** (Linux aarch64 en WebAssembly dentro del navegador del usuario).
Ya hay un servidor HTTP liviano corriendo en \`http://127.0.0.1:8000\` que sirve esta carpeta (\`~/threejs-games\`), y el usuario juega en tiempo real desde el panel **Preview** integrado de unkernel (\`/vm/<id>/8000/\`).

## Reglas obligatorias para que los juegos carguen rápido y sin trabarse

1. **NO uses \`npm\`, \`pnpm\`, \`yarn\`, Vite, Webpack ni pasos de build/compilación.**
   Escribí los juegos con **HTML5 + CSS + JavaScript ES Modules (\`.js\`) puro**.
2. **Usá SOLO rutas relativas** (\`./main.js\`, \`./style.css\`, \`./vendor/three.module.min.js\`), **NUNCA** rutas absolutas que empiecen con \`/\` (como \`/main.js\`), porque el Preview corre bajo el prefijo \`/vm/<id>/8000/\`.
3. **Importá Three.js mediante \`importmap\`** apuntando a la copia local cacheada \`./vendor/three.module.min.js\` (Three.js r170, autocontenido):
   \`\`\`html
   <script type="importmap">
   {
     "imports": {
       "three": "./vendor/three.module.min.js",
       "three/addons/": "${THREE_ADDONS_CDN}"
     }
   }
   </script>
   \`\`\`
   *(Si \`./vendor/three.module.min.js\` no existiera, usá \`${THREE_CDN}\`.)*
4. **Punto de entrada:** mantené el juego jugable en \`index.html\` (o enlazá varios juegos desde \`index.html\`).
5. **Assets livianos y compatibles con COEP:** generá geometrías, texturas en \`<canvas>\` y efectos de sonido con Web Audio API de forma procedural para evitar bloqueos de CORS/COEP y que cargue al instante.
6. **Rendimiento en PCs de bajos recursos:** limitá \`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))\`, reutilizá geometrías/materiales y mantené controles simples (teclado WASD/flechas + mouse/touch).
7. Al terminar cada cambio, avisale al usuario que recargue el panel **Preview** (o abra \`Ctrl-A p\` en el puerto \`8000\`) para probar el juego.
`;

const STARTER_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title>Three.js + agy Studio</title>
<style>
	* { box-sizing: border-box; }
	html, body { margin: 0; height: 100%; overflow: hidden; background: #070914; color: #eef2ff; font-family: system-ui, -apple-system, sans-serif; }
	canvas { display: block; width: 100%; height: 100%; touch-action: none; }
	.hud { position: fixed; top: 14px; left: 14px; right: 14px; display: flex; justify-content: space-between; align-items: flex-start; pointer-events: none; gap: 12px; }
	.card { background: rgba(10, 14, 30, 0.72); border: 1px solid rgba(129, 140, 248, 0.35); border-radius: 12px; padding: 10px 14px; backdrop-filter: blur(8px); }
	.score { font-size: 22px; font-weight: 700; letter-spacing: 0.02em; color: #38bdf8; }
	.sub { font-size: 12px; color: #a5b4fc; margin-top: 2px; }
	.hint { position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); background: rgba(10, 14, 30, 0.78); border: 1px solid rgba(129, 140, 248, 0.3); border-radius: 999px; padding: 7px 14px; font-size: 12px; color: #c7d2fe; white-space: nowrap; max-width: calc(100vw - 24px); overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
	.overlay { position: fixed; inset: 0; display: none; place-items: center; background: rgba(4, 6, 16, 0.72); backdrop-filter: blur(6px); }
	.overlay.show { display: grid; }
	.modal { text-align: center; background: #0f172a; border: 1px solid rgba(129, 140, 248, 0.45); border-radius: 16px; padding: 24px 28px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6); }
	.modal h1 { margin: 0 0 8px; font-size: 24px; }
	.modal p { margin: 0 0 18px; color: #cbd5e1; font-size: 14px; }
	button { cursor: pointer; border: 0; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600; color: #fff; background: linear-gradient(135deg, #6366f1, #0ea5e9); }
	button:hover { filter: brightness(1.1); }
</style>
<script type="importmap">
{
	"imports": {
		"three": "__THREE_SRC__",
		"three/addons/": "${THREE_ADDONS_CDN}"
	}
}
</script>
</head>
<body>
<div class="hud">
	<div class="card">
		<div class="score" id="score">0</div>
		<div class="sub" id="best">Record: 0</div>
	</div>
	<div class="card" style="text-align:right">
		<div style="font-weight:600;font-size:13px">Neon Runner 3D</div>
		<div class="sub">WASD / Flechas / Arrastrar</div>
	</div>
</div>
<div class="hint">Pedile a <b>agy</b> en la terminal que edite o cree un juego en index.html y recargá el Preview</div>
<div class="overlay" id="over">
	<div class="modal">
		<h1>Game Over</h1>
		<p id="final">Puntaje: 0</p>
		<button id="retry" type="button">Jugar de nuevo</button>
	</div>
</div>
<script type="module">
import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070914);
scene.fog = new THREE.FogExp2(0x070914, 0.032);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 3.6, 7.5);
camera.lookAt(0, 0.6, -6);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x8899ff, 0.9));
const sun = new THREE.DirectionalLight(0x60a5fa, 1.8);
sun.position.set(6, 12, 8);
scene.add(sun);

const grid = new THREE.GridHelper(120, 60, 0x38bdf8, 0x1e293b);
grid.position.y = -0.6;
scene.add(grid);

const ship = new THREE.Group();
const hull = new THREE.Mesh(
	new THREE.ConeGeometry(0.48, 1.5, 6),
	new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0c4a6e, roughness: 0.25, metalness: 0.7 }),
);
hull.rotation.x = -Math.PI / 2;
ship.add(hull);
const wing = new THREE.Mesh(
	new THREE.BoxGeometry(1.5, 0.1, 0.45),
	new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x312e81, roughness: 0.3, metalness: 0.6 }),
);
wing.position.set(0, -0.05, 0.25);
ship.add(wing);
scene.add(ship);

const gemGeo = new THREE.OctahedronGeometry(0.45, 0);
const gemMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0x713f12, roughness: 0.2, metalness: 0.8 });
const rockGeo = new THREE.DodecahedronGeometry(0.65, 0);
const rockMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0x4c0519, roughness: 0.45, metalness: 0.35 });

const items = [];
const keys = { left: false, right: false };
let targetX = 0, score = 0, best = Number(localStorage.getItem("threejs-best") || 0), alive = true, spawnT = 0;

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overEl = document.getElementById("over");
const finalEl = document.getElementById("final");
bestEl.textContent = "Record: " + best;

let audioCtx = null;
function beep(freq, dur, type = "sine") {
	try {
		audioCtx ??= new AudioContext();
		const o = audioCtx.createOscillator(), g = audioCtx.createGain();
		o.type = type; o.frequency.value = freq;
		g.gain.setValueAtTime(0.08, audioCtx.currentTime);
		g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
		o.connect(g).connect(audioCtx.destination);
		o.start(); o.stop(audioCtx.currentTime + dur);
	} catch {}
}

function spawn() {
	const isGem = Math.random() < 0.42;
	const mesh = new THREE.Mesh(isGem ? gemGeo : rockGeo, isGem ? gemMat : rockMat);
	mesh.position.set((Math.random() - 0.5) * 11, 0.15, -55);
	scene.add(mesh);
	items.push({ mesh, isGem });
}

function reset() {
	for (const it of items) scene.remove(it.mesh);
	items.length = 0;
	score = 0; targetX = 0; ship.position.x = 0; alive = true; spawnT = 0;
	scoreEl.textContent = "0";
	overEl.classList.remove("show");
}

addEventListener("keydown", (e) => {
	if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
	if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
	if (!alive && (e.code === "Space" || e.code === "Enter")) reset();
});
addEventListener("keyup", (e) => {
	if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
	if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
});
addEventListener("pointermove", (e) => {
	if (e.buttons || e.pointerType === "touch") targetX = ((e.clientX / innerWidth) * 2 - 1) * 5.5;
});
addEventListener("resize", () => {
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
});
document.getElementById("retry").addEventListener("click", reset);

let prev = performance.now();
function loop(now) {
	requestAnimationFrame(loop);
	const dt = Math.min((now - prev) / 1000, 0.05);
	prev = now;
	if (alive) {
		const speed = 22 + Math.min(score * 0.25, 24);
		if (keys.left) targetX -= 11 * dt;
		if (keys.right) targetX += 11 * dt;
		targetX = Math.max(-5.5, Math.min(5.5, targetX));
		ship.position.x += (targetX - ship.position.x) * Math.min(1, dt * 12);
		ship.rotation.z = (ship.position.x - targetX) * 0.14;
		grid.position.z = (grid.position.z + speed * dt) % 2;

		spawnT -= dt;
		if (spawnT <= 0) { spawn(); spawnT = Math.max(0.24, 0.65 - score * 0.005); }

		for (let i = items.length - 1; i >= 0; i--) {
			const it = items[i];
			it.mesh.position.z += speed * dt;
			it.mesh.rotation.y += 2.4 * dt;
			it.mesh.rotation.x += 1.2 * dt;
			const dx = it.mesh.position.x - ship.position.x;
			const dz = it.mesh.position.z - ship.position.z;
			if (dx * dx + dz * dz < (it.isGem ? 0.95 : 1.0)) {
				if (it.isGem) {
					score += 10;
					scoreEl.textContent = String(score);
					if (score > best) { best = score; localStorage.setItem("threejs-best", String(best)); bestEl.textContent = "Record: " + best; }
					beep(680, 0.12, "triangle");
					scene.remove(it.mesh);
					items.splice(i, 1);
					continue;
				}
				alive = false;
				beep(140, 0.28, "sawtooth");
				finalEl.textContent = "Puntaje: " + score + " · Record: " + best;
				overEl.classList.add("show");
			} else if (it.mesh.position.z > 9) {
				scene.remove(it.mesh);
				items.splice(i, 1);
			}
		}
	}
	renderer.render(scene, camera);
}
requestAnimationFrame(loop);
</script>
</body>
</html>
`;

const SETUP_SH = `#!/bin/sh
set -e
cd "$(dirname "$0")/.."

export PATH="$HOME/.local/bin:$PATH"

# 1. Seed AGENTS.md once so user edits are preserved across launches.
if [ ! -f AGENTS.md ]; then
	cp .unkernel/AGENTS.md.template AGENTS.md
fi

# 2. Cache Three.js locally once (~675 KB) for instant offline/COEP-safe loading.
THREE_SRC="${THREE_CDN}"
mkdir -p vendor
if [ ! -s vendor/three.module.min.js ]; then
	echo "Descargando Three.js r170 local (vendor/three.module.min.js)..."
	if curl -fsSL "${THREE_CDN}" -o vendor/three.module.min.js.tmp 2>/dev/null; then
		mv vendor/three.module.min.js.tmp vendor/three.module.min.js
	else
		rm -f vendor/three.module.min.js.tmp
		echo "Aviso: no se pudo cachear Three.js localmente; el juego usara el CDN."
	fi
fi
if [ -s vendor/three.module.min.js ]; then
	THREE_SRC="./vendor/three.module.min.js"
fi

# 3. Seed starter game once (never overwrite an existing index.html).
if [ ! -f index.html ]; then
	sed "s|__THREE_SRC__|$THREE_SRC|g" .unkernel/starter.html > index.html
fi

# 4. Start lightweight Python HTTP server on 127.0.0.1:8000 if not already running.
PID_FILE="/tmp/threejs-agy-http.pid"
running=0
if [ -f "$PID_FILE" ]; then
	old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
	if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
		running=1
	fi
fi
if [ "$running" -eq 0 ]; then
	if ! python3 -c "import socket,sys; s=socket.socket(); r=s.connect_ex(('127.0.0.1',8000)); s.close(); sys.exit(0 if r==0 else 1)" 2>/dev/null; then
		nohup python3 .unkernel/serve.py 8000 </dev/null >/tmp/threejs-agy-http.log 2>&1 &
		echo $! > "$PID_FILE"
		sleep 0.3
	fi
fi
echo "Preview HTTP activo en http://127.0.0.1:8000 (Ctrl-A p para abrir/recargar)"

# 5. Install Antigravity CLI (agy) if not installed yet.
if ! command -v agy >/dev/null 2>&1 && [ ! -x "$HOME/.local/bin/agy" ]; then
	echo "Instalando Antigravity CLI (agy) en ~/.local/bin..."
	curl -fsSL https://antigravity.google/cli/install.sh | bash
fi

AGY_BIN="$(command -v agy 2>/dev/null || echo "$HOME/.local/bin/agy")"
if [ ! -x "$AGY_BIN" ]; then
	echo "No se encontro el binario de agy en $AGY_BIN." >&2
	exit 1
fi

echo ""
echo "Workspace listo en ~/threejs-games (AGENTS.md configurado para Three.js sin npm)."
echo "Ejemplos para pedirle a agy:"
echo "  - Crea un juego 3D de carreras arcade en index.html con controles WASD"
echo "  - Mejora Neon Runner 3D agregando saltos, escudo y niveles de velocidad"
echo ""

"$AGY_BIN"
`;

export default {
	id: "agy-threejs",
	title: "agy · Three.js",
	desc: "Antigravity CLI + estudio de juegos 3D en Three.js con Preview WebGL en puerto 8000",
	// 3D isometric cube + spark representing Three.js + Antigravity CLI.
	icon: {
		svg: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M12 2.5 20.5 7.4v9.2L12 21.5 3.5 16.6V7.4L12 2.5Zm0 0v9.5m8.5-4.6L12 12 3.5 7.4"/><circle cx="12" cy="12" r="2.1" fill="#38bdf8"/>',
	},
	colors: ["#4f46e5", "#1e1b4b"],
	needs: { net: true },
	dir: "~/threejs-games",
	files: {
		".unkernel/serve.py": { content: SERVE_PY, mode: 0o755 },
		".unkernel/AGENTS.md.template": AGENTS_MD,
		".unkernel/starter.html": STARTER_HTML,
		".unkernel/setup.sh": { content: SETUP_SH, mode: 0o755 },
	},
	packages: {
		alpine: ["python3", "bash", "curl", "tar"],
		debian: ["python3", "curl", "ca-certificates"],
	},
	commands: [
		"./.unkernel/setup.sh",
	],
	ports: [8000],
} satisfies Demo;
