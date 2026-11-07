"""Generator ilustrasi karakter DEMO (SVG orisinal) -> public/characters/*.svg.
Jalankan: python3 scripts/generate-character-art.py
"""
import os, math

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "characters")
RARITY_BG = {
    1: ("#e2e8f0", "#94a3b8"), 2: ("#bbf7d0", "#22c55e"), 3: ("#bae6fd", "#0ea5e9"),
    4: ("#e9d5ff", "#a855f7"), 5: ("#fde68a", "#f59e0b"), 6: ("#fecdd3", "#e11d48"),
}
CHARS = [
    ("pip-pensil", 1, "#facc15", "pencil"), ("lumi-kertas", 1, "#f8fafc", "none"), ("tok-penghapus", 1, "#fda4af", "none"),
    ("kiko-kompas", 2, "#fdba74", "cap"), ("rara-rumus", 2, "#c4b5fd", "glasses"), ("bobo-buku", 2, "#93c5fd", "cap"),
    ("sena-sains", 3, "#86efac", "goggles"), ("hara-sejarah", 3, "#fcd34d", "scroll"), ("mika-matematika", 3, "#f9a8d4", "glasses"),
    ("arka-alkemis", 4, "#a5b4fc", "wizard"), ("nala-navigator", 4, "#5eead4", "cap"), ("tirta-pustaka", 4, "#7dd3fc", "glasses"),
    ("surya-profesor", 5, "#fde047", "mortar"), ("bayu-penyihir-bahasa", 5, "#c084fc", "wizard"), ("dewi-astronom", 5, "#a5f3fc", "star"),
    ("lentera-rinai", 5, "#fb923c", "star"),
    ("garuda-ilmu", 6, "#fbbf24", "crown"), ("naga-logika", 6, "#34d399", "horns"),
    ("ratu-aurora", 6, "#f0abfc", "crown"), ("ksatria-kala", 6, "#67e8f9", "helmet"),
]

def star_path(cx, cy, r):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append(f"{cx + rr * math.cos(ang):.1f},{cy + rr * math.sin(ang):.1f}")
    return "M" + " L".join(pts) + " Z"

def accessory(kind, skin):
    if kind == "crown":
        return '<path d="M78 70 L90 40 L108 62 L128 34 L148 62 L166 40 L178 70 Z" fill="#facc15" stroke="#a16207" stroke-width="3"/><circle cx="128" cy="44" r="5" fill="#e11d48"/>'
    if kind == "wizard":
        return '<path d="M72 78 L128 8 L184 78 Z" fill="#4c1d95"/><circle cx="140" cy="44" r="5" fill="#fde047"/><rect x="66" y="72" width="124" height="12" rx="6" fill="#6d28d9"/>'
    if kind == "mortar":
        return '<path d="M70 58 L128 38 L186 58 L128 78 Z" fill="#1e293b"/><line x1="176" y1="60" x2="182" y2="92" stroke="#fde047" stroke-width="3"/>'
    if kind == "cap":
        return '<path d="M80 74 Q128 28 176 74 Z" fill="#2563eb"/><rect x="150" y="68" width="44" height="9" rx="4" fill="#1d4ed8"/>'
    if kind == "horns":
        return '<path d="M86 70 L72 30 L104 60 Z" fill="#f8fafc"/><path d="M170 70 L184 30 L152 60 Z" fill="#f8fafc"/>'
    if kind == "helmet":
        return '<path d="M78 92 Q78 40 128 38 Q178 40 178 92 L166 92 Q164 56 128 54 Q92 56 90 92 Z" fill="#64748b"/><path d="M128 20 L136 40 L120 40 Z" fill="#e11d48"/>'
    if kind == "star":
        return f'<path d="{star_path(128, 46, 20)}" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>'
    if kind == "pencil":
        return '<rect x="118" y="20" width="20" height="50" fill="#f59e0b"/><path d="M118 70 L138 70 L128 86 Z" fill="#fcd34d"/>'
    if kind == "scroll":
        return '<rect x="176" y="150" width="44" height="30" rx="8" fill="#fef3c7" stroke="#b45309" stroke-width="3"/>'
    return ""

def eyes(kind):
    base = '<circle cx="108" cy="122" r="8" fill="#0f172a"/><circle cx="148" cy="122" r="8" fill="#0f172a"/><circle cx="111" cy="119" r="3" fill="#fff"/><circle cx="151" cy="119" r="3" fill="#fff"/>'
    if kind == "glasses":
        base += '<circle cx="108" cy="122" r="15" fill="none" stroke="#1e293b" stroke-width="4"/><circle cx="148" cy="122" r="15" fill="none" stroke="#1e293b" stroke-width="4"/><line x1="123" y1="122" x2="133" y2="122" stroke="#1e293b" stroke-width="4"/>'
    if kind == "goggles":
        base += '<rect x="88" y="108" width="80" height="28" rx="14" fill="none" stroke="#0369a1" stroke-width="5"/>'
    return base

def svg(slug, rarity, skin, acc):
    light, dark = RARITY_BG[rarity]
    stars = "".join(
        f'<path d="{star_path(128 - (rarity - 1) * 14 + i * 28, 236, 9)}" fill="#fde047" stroke="#854d0e" stroke-width="1.5"/>'
        for i in range(rarity)
    )
    glow = '<circle cx="128" cy="128" r="118" fill="url(#glow)"/>' if rarity >= 5 else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="{slug}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{light}"/><stop offset="1" stop-color="{dark}"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="256" height="256" rx="32" fill="url(#bg)"/>
<circle cx="40" cy="44" r="18" fill="#ffffff" opacity="0.25"/><circle cx="214" cy="200" r="26" fill="#ffffff" opacity="0.18"/>
{glow}
<path d="M70 222 Q72 170 128 166 Q184 170 186 222 Z" fill="{dark}" stroke="#0f172a" stroke-opacity="0.25" stroke-width="3"/>
<ellipse cx="128" cy="124" rx="58" ry="56" fill="{skin}" stroke="#0f172a" stroke-opacity="0.3" stroke-width="3"/>
<circle cx="94" cy="142" r="8" fill="#fb7185" opacity="0.45"/><circle cx="162" cy="142" r="8" fill="#fb7185" opacity="0.45"/>
{eyes(acc)}
<path d="M114 148 Q128 160 142 148" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
{accessory(acc, skin)}
{stars}
</svg>
'''

os.makedirs(OUT, exist_ok=True)
for slug, rarity, skin, acc in CHARS:
    with open(os.path.join(OUT, f"{slug}.svg"), "w") as f:
        f.write(svg(slug, rarity, skin, acc))
print(f"{len(CHARS)} karakter dibuat di {os.path.abspath(OUT)}")
