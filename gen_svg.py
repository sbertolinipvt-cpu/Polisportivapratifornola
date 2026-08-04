import os

OUT = "assets/svg"
os.makedirs(OUT, exist_ok=True)

DISCIPLINES = {
    "jj":   {"bg": "#C31E2A", "bg2": "#8F1620", "fg": "#FFFFFF"},
    "pat":  {"bg": "#F2B705", "bg2": "#C99400", "fg": "#141210"},
    "gin":  {"bg": "#C31E2A", "bg2": "#8F1620", "fg": "#FFFFFF"},
    "pal":  {"bg": "#F2B705", "bg2": "#C99400", "fg": "#141210"},
    "moto": {"bg": "#141210", "bg2": "#3A3530", "fg": "#F2B705"},
}

W, H = 800, 600

def pattern(kind, c1, c2):
    if kind == "stripes":
        return f'''<rect width="{W}" height="{H}" fill="{c1}"/>
<g stroke="{c2}" stroke-width="26" opacity="0.5">
{''.join(f'<line x1="{x}" y1="0" x2="{x-260}" y2="{H}"/>' for x in range(-200, W+400, 70))}
</g>'''
    if kind == "dots":
        dots = []
        for yy in range(0, H+40, 46):
            for xx in range(0, W+40, 46):
                off = 23 if (yy//46) % 2 else 0
                dots.append(f'<circle cx="{xx+off}" cy="{yy}" r="5" fill="{c2}" opacity="0.55"/>')
        return f'<rect width="{W}" height="{H}" fill="{c1}"/>' + "".join(dots)
    if kind == "grid":
        lines = []
        for xx in range(0, W+40, 40):
            lines.append(f'<line x1="{xx}" y1="0" x2="{xx}" y2="{H}"/>')
        for yy in range(0, H+40, 40):
            lines.append(f'<line x1="0" y1="{yy}" x2="{W}" y2="{yy}"/>')
        return f'<rect width="{W}" height="{H}" fill="{c1}"/><g stroke="{c2}" stroke-width="1.4" opacity="0.5">{"".join(lines)}</g>'
    if kind == "waves":
        paths = []
        for i, yy in enumerate(range(-40, H+80, 60)):
            paths.append(f'<path d="M -50 {yy} Q {W/4} {yy-40} {W/2} {yy} T {W+50} {yy}" fill="none" stroke="{c2}" stroke-width="6" opacity="0.45"/>')
        return f'<rect width="{W}" height="{H}" fill="{c1}"/>' + "".join(paths)
    if kind == "chevron":
        chevs = []
        step = 56
        for yy in range(-step, H+step*2, step):
            chevs.append(f'<path d="M -40 {yy} L {W/2} {yy+90} L {W+40} {yy} L {W+40} {yy+40} L {W/2} {yy+130} L -40 {yy+40} Z" fill="{c2}" opacity="0.35"/>')
        return f'<rect width="{W}" height="{H}" fill="{c1}"/>' + "".join(chevs)
    if kind == "rays":
        rays = []
        import math
        cx, cy = W/2, H/2
        for i in range(0, 360, 18):
            a = math.radians(i)
            x2 = cx + math.cos(a) * 900
            y2 = cy + math.sin(a) * 900
            rays.append(f'<line x1="{cx}" y1="{cy}" x2="{x2}" y2="{y2}" stroke="{c2}" stroke-width="10" opacity="0.18"/>')
        return f'<rect width="{W}" height="{H}" fill="{c1}"/>' + "".join(rays)
    if kind == "diagonal":
        return f'''<rect width="{W}" height="{H}" fill="{c1}"/>
<polygon points="0,0 {W},0 {W*0.35},{H} 0,{H}" fill="{c2}" opacity="0.4"/>
<polygon points="{W},0 {W},{H} {W*0.6},{H}" fill="{c2}" opacity="0.22"/>'''
    if kind == "arcs":
        import math
        arcs = []
        cx, cy = W*0.15, H*1.05
        for r in range(90, 900, 70):
            arcs.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{c2}" stroke-width="14" opacity="0.28"/>')
        return f'<rect width="{W}" height="{H}" fill="{c1}"/><g clip-path="none">' + "".join(arcs) + "</g>"
    if kind == "cross":
        lines = []
        for xx in range(-40, W+80, 60):
            lines.append(f'<line x1="{xx}" y1="0" x2="{xx+H}" y2="{H}" stroke="{c2}" stroke-width="3" opacity="0.4"/>')
            lines.append(f'<line x1="{xx}" y1="{H}" x2="{xx+H}" y2="0" stroke="{c2}" stroke-width="3" opacity="0.4"/>')
        return f'<rect width="{W}" height="{H}" fill="{c1}"/><g>' + "".join(lines) + "</g>"
    if kind == "confetti":
        import random
        random.seed(hash(c1+c2) % 1000)
        shapes = []
        for i in range(70):
            x = random.randint(0, W); y = random.randint(0, H); r = random.randint(4, 16)
            shapes.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c2}" opacity="{round(random.uniform(0.2,0.5),2)}"/>')
        return f'<rect width="{W}" height="{H}" fill="{c1}"/>' + "".join(shapes)
    if kind == "blocks":
        import random
        random.seed(hash(c1+c2+"b") % 1000)
        shapes = []
        step = 90
        for yy in range(0, H, step):
            for xx in range(0, W, step):
                if random.random() > 0.55:
                    shapes.append(f'<rect x="{xx}" y="{yy}" width="{step-8}" height="{step-8}" fill="{c2}" opacity="0.28"/>')
        return f'<rect width="{W}" height="{H}" fill="{c1}"/>' + "".join(shapes)
    return f'<rect width="{W}" height="{H}" fill="{c1}"/>'

PICTOS = {
"jj": '''<g transform="translate(400,300)" fill="none" stroke="{fg}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="-30" cy="-150" r="34" fill="{fg}" stroke="none"/>
  <path d="M -30 -116 L -30 -20 L -110 60"/>
  <path d="M -30 -20 L 60 -55 L 130 -125"/>
  <path d="M -30 -20 L 20 90 L -10 190"/>
  <path d="M -30 -20 L -90 70 L -70 180"/>
  <path d="M -170 100 L -60 60 L 40 100" opacity="0.55"/>
</g>''',
"pat": '''<g transform="translate(400,320)" fill="none" stroke="{fg}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="10" cy="-160" r="32" fill="{fg}" stroke="none"/>
  <path d="M 10 -128 L -10 -30 L -90 20"/>
  <path d="M -10 -30 L 90 -60 L 150 -130"/>
  <path d="M -10 -30 L 60 60 L 130 40"/>
  <path d="M -10 -30 L -60 70 L -40 170"/>
  <path d="M -110 200 L 170 200" stroke-width="18" opacity="0.7"/>
  <path d="M -40 170 L -100 210" />
</g>''',
"gin": '''<g transform="translate(400,300)" fill="none" stroke="{fg}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="0" cy="-170" r="30" fill="{fg}" stroke="none"/>
  <path d="M 0 -140 L 0 -40"/>
  <path d="M 0 -110 L -140 -170"/>
  <path d="M 0 -110 L 140 -60"/>
  <path d="M 0 -40 L -70 90 L -40 190"/>
  <path d="M 0 -40 L 90 40 L 60 170"/>
</g>''',
"pal": '''<g transform="translate(400,300)" fill="none" stroke="{fg}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="0" cy="60" r="46" fill="none"/>
  <path d="M -40 30 Q 0 -10 40 30" />
  <path d="M -46 60 L 46 60" opacity="0.6"/>
  <circle cx="30" cy="-170" r="30" fill="{fg}" stroke="none"/>
  <path d="M 30 -140 L 10 -70"/>
  <path d="M 10 -70 L -80 -110"/>
  <path d="M 10 -70 L 90 -140"/>
  <path d="M 10 -70 L -20 40"/>
  <path d="M -20 40 L -60 150"/>
  <path d="M -20 40 L 40 150"/>
</g>''',
"moto": '''<g transform="translate(400,340)" fill="none" stroke="{fg}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="-160" cy="70" r="60"/>
  <circle cx="160" cy="70" r="60"/>
  <path d="M -160 70 L -60 -20 L 40 -20 L 160 70"/>
  <path d="M -60 -20 L -20 70 L 90 70"/>
  <path d="M 40 -20 L 60 -90 L 130 -90"/>
  <path d="M -20 70 L -20 20" />
  <circle cx="-20" cy="-40" r="24" fill="{fg}" stroke="none"/>
</g>'''
}

CAPTIONS = {
  "jj": ["Allenamento tecnico sul tatami", "Randori tra i più giovani", "Passaggio di cintura", "Stage con maestro ospite", "Fighting system in azione", "Squadra agonisti", "Riscaldamento di gruppo", "Premiazione di fine gara", "Lezione di autodifesa"],
  "pat": ["Prove libere in pista", "Coreografia solo dance", "Gara regionale UISP", "Gioca pattino: primi passi", "Sincronizzato junior", "Esibizione di fine anno", "Allenamento tecnico", "Premiazione in pista", "Il gruppo agonisti"],
  "gin": ["Riscaldamento a corpo libero", "Lavoro agli attrezzi", "Saggio di fine corso", "Corso genitore-bambino", "Preparazione gara", "Gruppo agonistico", "Esercizi di equilibrio", "Musica e coreografia", "Festa di fine anno"],
  "pal": ["Allenamento di ricezione", "Torneo amichevole", "Minivolley in palestra", "Serata partita in casa", "Muro a rete", "Squadra al completo", "Riscaldamento pre-gara", "Premiazione torneo", "Palleggio in allenamento"],
  "moto": ["Uscita sociale in Val di Vara", "Raduno soci", "Manutenzione in sede", "Partenza al passo del Bracco", "Giro panoramico golfo dei Poeti", "Assemblea e amici", "Sosta panoramica", "Serata in sede", "Raduno con altri club"],
}

for code, cols in DISCIPLINES.items():
    kinds = ["stripes","dots","grid","waves","chevron","rays","cross","confetti","blocks"]
    for i, kind in enumerate(kinds, start=1):
        body = pattern(kind, cols["bg"], cols["bg2"])
        picto = PICTOS[code].format(fg=cols["fg"])
        svg = f'''<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{CAPTIONS[code][i-1]}">
<title>{CAPTIONS[code][i-1]}</title>
{body}
{picto}
</svg>'''
        with open(f"{OUT}/{code}-{i}.svg", "w") as f:
            f.write(svg)


# ---- icone stilizzate per l'header di pagina (trasparenti, tratto bianco) ----
ICON_W, ICON_H = 260, 260
CENTER_SHIFT = {
    "jj":   (130, 190),
    "pat":  (130, 200),
    "gin":  (130, 190),
    "pal":  (130, 190),
    "moto": (130, 210),
}
for code in DISCIPLINES:
    cx, cy = CENTER_SHIFT[code]
    picto = PICTOS[code].format(fg="#FFFFFF").replace(
        f'translate(400,{ {"jj":300,"pat":320,"gin":300,"pal":300,"moto":340}[code] })',
        f'translate({cx},{cy}) scale(0.62)'
    )
    svg = f'''<svg viewBox="0 0 {ICON_W} {ICON_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Icona {code}">
{picto}
</svg>'''
    with open(f"{OUT}/{code}-icon.svg", "w") as f:
        f.write(svg)


# ---- immagini "in evidenza" per ogni disciplina (in aggiunta alla fotogallery) ----
FEATURE_CAPTIONS = {
    "jj":   ["La squadra al completo", "Il tatami della Polisportiva", "Un momento di premiazione"],
    "pat":  ["Il gruppo pattinatori", "La pista della Polisportiva", "Un momento di premiazione"],
    "gin":  ["Il gruppo ginnastica", "La palestra della Polisportiva", "Un momento del saggio"],
    "pal":  ["La squadra al completo", "Il palazzetto della Polisportiva", "Un momento di premiazione"],
    "moto": ["Il gruppo Club Moto", "La sede sociale", "Un momento del raduno"],
}
FW, FH = 900, 620
feature_kinds = ["diagonal", "arcs", "waves"]
for code, cols in DISCIPLINES.items():
    for i, kind in enumerate(feature_kinds, start=1):
        old_w, old_h = W, H
        globals()["W"], globals()["H"] = FW, FH
        body = pattern(kind, cols["bg"], cols["bg2"])
        globals()["W"], globals()["H"] = old_w, old_h
        cx, cy = FW/2, FH/2 + 40
        picto = PICTOS[code].format(fg=cols["fg"]).replace(
            f'translate(400,{ {"jj":300,"pat":320,"gin":300,"pal":300,"moto":340}[code] })',
            f'translate({cx},{cy}) scale(0.95)'
        )
        svg = f'''<svg viewBox="0 0 {FW} {FH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{FEATURE_CAPTIONS[code][i-1]}">
<title>{FEATURE_CAPTIONS[code][i-1]}</title>
{body}
{picto}
</svg>'''
        with open(f"{OUT}/{code}-feature-{i}.svg", "w") as f:
            f.write(svg)

for code in DISCIPLINES:
    cols = DISCIPLINES[code]
    svg = f'''<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Foto profilo non caricata">
<rect width="200" height="200" fill="{cols["bg"]}"/>
<circle cx="100" cy="78" r="34" fill="{cols["fg"]}" opacity="0.9"/>
<path d="M 30 190 Q 100 120 170 190 Z" fill="{cols["fg"]}" opacity="0.9"/>
</svg>'''
    with open(f"{OUT}/{code}-avatar.svg", "w") as f:
        f.write(svg)

print("done")
