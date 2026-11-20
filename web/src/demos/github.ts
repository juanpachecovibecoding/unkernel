// SPDX-License-Identifier: MIT
// GitHub CLI (gh) + Git connector: installs git and GitHub CLI on Debian/Alpine,
// authenticates via GitHub's browser Device Flow (no manual PAT needed), links
// git credentials with `gh auth setup-git`, and configures global git identity
// so agy (Gemini) can create repositories, commit, and push automatically.
import type { Demo } from "../launcher.ts";

const CONNECT_SH = `#!/bin/sh
set -e

if [ -z "\${BROWSER:-}" ] && command -v xdg-open >/dev/null 2>&1; then
	export BROWSER=xdg-open
fi

if gh auth status >/dev/null 2>&1; then
	echo "GitHub ya esta conectado:"
	gh auth status
else
	echo "Conectando tu cuenta de GitHub (OAuth Device Flow)..."
	echo "1) Copia el codigo de 8 caracteres que aparece abajo."
	echo "2) Abri https://github.com/login/device (o acepta abrir la pestana) y autoriza."
	echo ""
	gh auth login --hostname github.com --git-protocol https --web
fi

echo ""
echo "Vinculando credenciales de git con GitHub CLI..."
gh auth setup-git

git config --global init.defaultBranch main

GH_LOGIN="$(gh api user --jq '.login' 2>/dev/null || true)"
GH_NAME="$(gh api user --jq '.name // .login' 2>/dev/null || true)"
GH_ID="$(gh api user --jq '.id' 2>/dev/null || true)"
GH_EMAIL="$(gh api user --jq '.email // empty' 2>/dev/null || true)"

if [ -z "$GH_EMAIL" ] && [ -n "$GH_ID" ] && [ -n "$GH_LOGIN" ]; then
	GH_EMAIL="\${GH_ID}+\${GH_LOGIN}@users.noreply.github.com"
fi

if [ -z "$(git config --global user.name 2>/dev/null || true)" ] && [ -n "$GH_NAME" ]; then
	git config --global user.name "$GH_NAME"
fi
if [ -z "$(git config --global user.email 2>/dev/null || true)" ] && [ -n "$GH_EMAIL" ]; then
	git config --global user.email "$GH_EMAIL"
fi

echo ""
echo "Listo. Git y GitHub quedaron configurados en esta instancia:"
echo "  Usuario GitHub : \${GH_LOGIN:-conectado}"
echo "  git user.name  : $(git config --global user.name 2>/dev/null || echo '(sin definir)')"
echo "  git user.email : $(git config --global user.email 2>/dev/null || echo '(sin definir)')"
echo ""
echo "Ahora podes volver a 'Play Code · agy' y pedirle por ejemplo:"
echo "  - Crea un repo publico 'mi-juego-3d' en mi GitHub y subi este proyecto"
echo "  - Hace commit y push de los cambios a GitHub"
echo ""
echo "Nota: si estas en una PC compartida, cerra sesion al terminar con: gh auth logout"
`;

export default {
	id: "github",
	title: "GitHub",
	desc: "Instala Git + GitHub CLI (gh) y conecta tu cuenta para que agy cree repos y haga push",
	// The GitHub logo, from Simple Icons (CC0 1.0), slug github.
	icon: {
		svg: '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>',
	},
	colors: ["#334155", "#0f172a"],
	needs: { net: true },
	community: true,
	files: {
		"connect.sh": { content: CONNECT_SH, mode: 0o755 },
	},
	packages: {
		alpine: ["git", "github-cli"],
		debian: ["git", "gh"],
	},
	commands: [
		"./connect.sh",
	],
} satisfies Demo;
