// SPDX-License-Identifier: MIT
// Laboratorio de IA Play Code (Antigravity CLI + Three.js / Web Studio):
// prepares ~/threejs-games with a local self-contained Three.js ES module, an
// AGENTS.md tailored for zero-build unkernel previews, a Three.js 3D splash
// featuring the orange </> Play Code emblem (without overwriting user apps),
// a lightweight Python HTTP server on 127.0.0.1:8000 with proper JS MIME types
// and no-store caching, and launches agy (installing it on first use).
import type { Demo } from "../launcher.ts";

const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";
const THREE_ADDONS_CDN = "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/";

const SERVE_PY = `#!/usr/bin/env python3
"""Lightweight static HTTP server for Three.js and web previews in unkernel."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class StudioHandler(SimpleHTTPRequestHandler):
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
    server = ReusableServer(("127.0.0.1", PORT), StudioHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
`;

const AGENTS_MD = `# Laboratorio de IA Play Code (unkernel + agy)

Estás trabajando dentro de **unkernel** (Linux aarch64 en WebAssembly dentro del navegador del usuario).
Ya hay un servidor HTTP liviano corriendo en \`http://127.0.0.1:8000\` que sirve esta carpeta (\`~/threejs-games\`), y el usuario ve los resultados en tiempo real desde el panel **Preview** integrado de unkernel (\`/vm/<id>/8000/\`).

## Reglas obligatorias para juegos Three.js, sitios web y webapps rápidos

1. **NO uses \`npm\`, \`pnpm\`, \`yarn\`, Vite, Webpack ni pasos de build/compilación.**
   Construí los proyectos con **HTML5 + CSS + JavaScript ES Modules (\`.js\`) puro**.
2. **Usá SOLO rutas relativas** (\`./main.js\`, \`./style.css\`, \`./vendor/three.module.min.js\`), **NUNCA** rutas absolutas que empiecen con \`/\` (como \`/main.js\`), porque el Preview corre bajo el prefijo \`/vm/<id>/8000/\`.
3. **Para proyectos 3D con Three.js**, usá un \`importmap\` apuntando a la copia local cacheada \`./vendor/three.module.min.js\` (Three.js r170, autocontenido):
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
4. **Punto de entrada:** mantené el proyecto principal en \`index.html\` (o enlazá múltiples proyectos desde \`index.html\`).
5. **Assets livianos y compatibles con COEP:** generá geometrías, texturas en \`<canvas>\` y audio con Web Audio API de forma procedural, o usá CDNs con CORS/CORP (\`cdn.jsdelivr.net\`, \`esm.sh\`).
6. **Rendimiento en PCs de bajos recursos:** limitá \`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))\` y reutilizá geometrías/materiales.
7. **GitHub (\`gh\` + \`git\`):** si el usuario pide crear un repositorio o subir el código a GitHub, verificá \`gh auth status\` y usá \`git\` + \`gh repo create <nombre> --public --source=. --push\` (o \`git push\`). Mantené \`.gitignore\` excluyendo \`.unkernel/\`, \`run.sh\` y \`AGENTS.md\` para subir solo el código limpio del proyecto.
8. Al terminar cada cambio, avisale al usuario que recargue el panel **Preview** (o abra \`Ctrl-A p\` en el puerto \`8000\`) para verlo en vivo.
`;

const GITIGNORE = `.unkernel/
run.sh
AGENTS.md
.DS_Store
`;

const STARTER_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Laboratorio de IA Play Code</title>
<style>
	* { box-sizing: border-box; }
	html, body {
		margin: 0;
		height: 100%;
		overflow: hidden;
		background: radial-gradient(circle at 50% 42%, #1c1008 0%, #09090f 55%, #040407 100%);
		color: #f8fafc;
		font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
	}
	canvas { display: block; width: 100%; height: 100%; }
	.ui {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		padding: clamp(20px, 4vh, 42px) 20px;
		pointer-events: none;
		text-align: center;
	}
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		border-radius: 999px;
		background: rgba(249, 115, 22, 0.14);
		border: 1px solid rgba(249, 115, 22, 0.42);
		color: #fdba74;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		backdrop-filter: blur(8px);
	}
	.badge-code {
		color: #ff6b00;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-weight: 800;
		font-size: 13px;
	}
	.title-wrap {
		margin-top: auto;
		margin-bottom: 10px;
	}
	h1 {
		margin: 0;
		font-size: clamp(24px, 4.6vw, 44px);
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.1;
		background: linear-gradient(135deg, #ffffff 15%, #fed7aa 65%, #f97316 100%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		text-shadow: 0 12px 36px rgba(249, 115, 22, 0.18);
	}
	.brand {
		margin-top: 6px;
		font-size: clamp(14px, 2.2vw, 19px);
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #fb923c;
	}
	.hint {
		margin-top: 14px;
		padding: 7px 14px;
		border-radius: 999px;
		background: rgba(12, 12, 18, 0.72);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #cbd5e1;
		font-size: 12px;
		max-width: min(560px, calc(100vw - 32px));
		backdrop-filter: blur(8px);
	}
	.hint b { color: #fb923c; }
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
<div class="ui">
	<div class="badge"><span class="badge-code">&lt;/&gt;</span> Three.js · WebGL</div>
	<div class="title-wrap">
		<h1>Laboratorio de IA</h1>
		<div class="brand">Play Code</div>
		<div class="hint">Pedile a <b>agy</b> en la terminal que cree un juego 3D, sitio web o webapp en <b>index.html</b> y recargá el Preview</div>
	</div>
</div>
<script type="module">
import * as THREE from "three";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.25, 10.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

// Studio lighting tailored for glossy orange 3D emblem
scene.add(new THREE.AmbientLight(0xfff1e6, 0.55));
const key = new THREE.DirectionalLight(0xffb366, 2.6);
key.position.set(5, 7, 8);
scene.add(key);
const rim = new THREE.PointLight(0xff5500, 18, 28, 1.5);
rim.position.set(-5, -3, 5);
scene.add(rim);
const fill = new THREE.PointLight(0x38bdf8, 5, 24, 1.8);
fill.position.set(6, -4, -3);
scene.add(fill);

function poly(points) {
	const shape = new THREE.Shape();
	shape.moveTo(points[0][0], points[0][1]);
	for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
	shape.closePath();
	return shape;
}

const extrudeOpts = {
	depth: 0.44,
	bevelEnabled: true,
	bevelThickness: 0.09,
	bevelSize: 0.06,
	bevelSegments: 3,
};

const logoMat = new THREE.MeshStandardMaterial({
	color: 0xff6b00,
	emissive: 0xc2410c,
	emissiveIntensity: 0.55,
	roughness: 0.24,
	metalness: 0.42,
});

const slashMat = new THREE.MeshStandardMaterial({
	color: 0xff922b,
	emissive: 0xea580c,
	emissiveIntensity: 0.65,
	roughness: 0.18,
	metalness: 0.52,
});

// Build crisp 3D </> symbol centered at origin
const logoGroup = new THREE.Group();
logoGroup.position.y = 0.65;

const leftChevron = poly([
	[-3.25, 0],
	[-1.55, -1.38],
	[-1.26, -1.04],
	[-2.54, 0],
	[-1.26, 1.04],
	[-1.55, 1.38],
]);

const slash = poly([
	[0.72, 1.65],
	[0.26, 1.65],
	[-0.72, -1.65],
	[-0.26, -1.65],
]);

const rightChevron = poly([
	[3.25, 0],
	[1.55, 1.38],
	[1.26, 1.04],
	[2.54, 0],
	[1.26, -1.04],
	[1.55, -1.38],
]);

for (const [shape, mat] of [[leftChevron, logoMat], [slash, slashMat], [rightChevron, logoMat]]) {
	const geo = new THREE.ExtrudeGeometry(shape, extrudeOpts);
	geo.translate(0, 0, -extrudeOpts.depth / 2);
	logoGroup.add(new THREE.Mesh(geo, mat));
}

// Subtle tech halo rings orbiting the </> emblem
const ringOuter = new THREE.Mesh(
	new THREE.TorusGeometry(4.15, 0.025, 12, 96),
	new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.35 }),
);
ringOuter.rotation.x = 1.15;
ringOuter.rotation.y = 0.25;
logoGroup.add(ringOuter);

const ringInner = new THREE.Mesh(
	new THREE.TorusGeometry(3.75, 0.018, 12, 96),
	new THREE.MeshBasicMaterial({ color: 0xfdba74, transparent: true, opacity: 0.22 }),
);
ringInner.rotation.x = -1.05;
ringInner.rotation.y = -0.35;
logoGroup.add(ringInner);

scene.add(logoGroup);

// Lightweight ambient particle field
const count = 160;
const pos = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
	const r = 4.5 + Math.random() * 11;
	const theta = Math.random() * Math.PI * 2;
	const phi = Math.acos(2 * Math.random() - 1);
	pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
	pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
	pos[i * 3 + 2] = r * Math.cos(phi) - 2;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
const particles = new THREE.Points(
	pGeo,
	new THREE.PointsMaterial({ color: 0xfb923c, size: 0.075, transparent: true, opacity: 0.65 }),
);
scene.add(particles);

let ptrX = 0, ptrY = 0;
addEventListener("pointermove", (e) => {
	ptrX = (e.clientX / innerWidth) * 2 - 1;
	ptrY = (e.clientY / innerHeight) * 2 - 1;
});

function resize() {
	camera.aspect = innerWidth / innerHeight;
	camera.position.z = innerWidth < 640 ? 13.5 : 10.5;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
}
resize();
addEventListener("resize", resize);

const clock = new THREE.Clock();
function animate() {
	requestAnimationFrame(animate);
	const t = clock.getElapsedTime();
	const targetY = Math.sin(t * 0.7) * 0.28 + ptrX * 0.42;
	const targetX = Math.cos(t * 0.5) * 0.08 + ptrY * 0.26;
	logoGroup.rotation.y += (targetY - logoGroup.rotation.y) * 0.06;
	logoGroup.rotation.x += (targetX - logoGroup.rotation.x) * 0.06;
	logoGroup.position.y = 0.65 + Math.sin(t * 1.4) * 0.14;
	ringOuter.rotation.z = t * 0.28;
	ringInner.rotation.z = -t * 0.36;
	particles.rotation.y = t * 0.05;
	particles.rotation.x = Math.sin(t * 0.15) * 0.08;
	renderer.render(scene, camera);
}
animate();
</script>
</body>
</html>
`;

const SETUP_SH = `#!/bin/sh
set -e
cd "$(dirname "$0")/.."

export PATH="$HOME/.local/bin:$PATH"

# 1. Seed AGENTS.md and .gitignore once so user edits are preserved across launches.
if [ ! -f AGENTS.md ]; then
	cp .unkernel/AGENTS.md.template AGENTS.md
fi
if [ ! -f .gitignore ]; then
	cp .unkernel/gitignore.template .gitignore
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
		echo "Aviso: no se pudo cachear Three.js localmente; se usara el CDN."
	fi
fi
if [ -s vendor/three.module.min.js ]; then
	THREE_SRC="./vendor/three.module.min.js"
fi

# 3. Seed Play Code Three.js splash (never overwrite user-created apps; upgrade old starter).
if [ ! -f index.html ] || grep -q "<title>Three.js + agy Studio</title>" index.html 2>/dev/null; then
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

# 6. Configure agy in Turbo mode by default (preserving any existing settings).
python3 - <<'PY'
import json, os

cfg_dir = os.path.expanduser("~/.gemini/antigravity-cli")
cfg_path = os.path.join(cfg_dir, "settings.json")
os.makedirs(cfg_dir, exist_ok=True)
try:
    with open(cfg_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        data = {}
except Exception:
    data = {}

data.setdefault("$schema", "https://antigravity.google/schemas/v1/settings.json")
data["toolPermission"] = "always-proceed"
data["agentMode"] = "accept-edits"
ws = os.path.realpath(os.getcwd())
trusted = data.get("trustedWorkspaces")
if not isinstance(trusted, list):
    trusted = []
if ws not in trusted:
    trusted.append(ws)
data["trustedWorkspaces"] = trusted

with open(cfg_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\\n")
PY

echo ""
echo "Laboratorio de IA Play Code listo en ~/threejs-games (modo Turbo activo)."
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
	echo "GitHub conectado (podes pedirle a agy que cree repos y haga push)."
fi
echo "Pedile a agy que cree juegos 3D en Three.js, sitios web o webapps en index.html."
echo ""

"$AGY_BIN" --dangerously-skip-permissions
`;

export default {
	id: "agy-threejs",
	title: "Play Code · agy",
	desc: "Laboratorio de IA Play Code: Antigravity CLI + Three.js y webapps con Preview en puerto 8000",
	// Bold </> emblem for Laboratorio de IA Play Code.
	icon: {
		svg: '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.6 5.5 10.4 18.5"/>',
	},
	colors: ["#f97316", "#9a3412"],
	needs: { net: true },
	dir: "~/threejs-games",
	files: {
		".unkernel/serve.py": { content: SERVE_PY, mode: 0o755 },
		".unkernel/AGENTS.md.template": AGENTS_MD,
		".unkernel/gitignore.template": GITIGNORE,
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
