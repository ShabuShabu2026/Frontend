# SI: drafted with Claude (Anthropic) on 2026-11-15, reviewed by Team ShabuShabu.
# HoneyMoon logo: the Moon as a honeycomb, one cell near the south pole filled with honey.
# Usage: python3 make_logo.py  -> writes honeymoon_mark.svg, honeymoon_icon.svg, honeymoon_lockup.svg
import math, os

OUT = os.path.dirname(os.path.abspath(__file__))
HONEY = "#E0A238"
MOON, MOON_DARK, GAP = "#D9DCE0", "#5B626C", "#3A4049"

def mix(a, b, t):
    a = [int(a[i:i+2], 16) for i in (1, 3, 5)]; b = [int(b[i:i+2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * t):02X}" for x, y in zip(a, b))
NAVY, INK = "#0E131B", "#EEF0F3"

def hex_pts(cx, cy, s):
    return [(cx + s * math.cos(math.radians(60 * k - 30)), cy + s * math.sin(math.radians(60 * k - 30))) for k in range(6)]

def path(pts):
    return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in pts) + " Z"

def moon(cx, cy, r, s, uid, drip=True):
    """Honeycomb moon. Returns SVG fragment. Cells inset so the gaps read as the comb walls."""
    w, h = math.sqrt(3) * s, 1.5 * s
    cells, row = [], -int(r / h) - 2
    while row * h < r + 2 * s:
        y = cy + row * h
        off = (w / 2) if row % 2 else 0
        col = -int(r / w) - 2
        while col * w < r + 2 * w:
            x = cx + col * w + off
            if math.hypot(x - cx, y - cy) < r + s:
                cells.append((x, y))
            col += 1
        row += 1
    # cells fully inside the rim (candidates for the honey cell)
    inside = [c for c in cells if math.hypot(c[0] - cx, c[1] - cy) < r - s * 1.05]
    # off-centre, lower right (south pole side, on the shaded limb)
    honey = min(inside, key=lambda c: math.hypot(c[0] - (cx + r * 0.48), c[1] - (cy + r * 0.45)))
    # a few dimmer cells for maria, upper-left
    dim = {c for c in cells if math.hypot(c[0] - (cx - r * 0.3), c[1] - (cy - r * 0.25)) < r * 0.28}
    dim |= {c for c in cells if math.hypot(c[0] - (cx + r * 0.35), c[1] - (cy - r * 0.05)) < r * 0.16}
    g = [f'<defs><clipPath id="clip{uid}"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath></defs>',
         f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{GAP}"/>',
         f'<g clip-path="url(#clip{uid})">']
    L = (-0.55, -0.45, 0.70)  # light from upper left, normalised below
    n = math.sqrt(sum(v * v for v in L)); L = [v / n for v in L]
    for c in cells:
        if c == honey:
            continue
        dx, dy = (c[0] - cx) / r, (c[1] - cy) / r
        dz = math.sqrt(max(0.0, 1 - dx * dx - dy * dy))
        lit = max(0.0, dx * L[0] + dy * L[1] + dz * L[2])
        t = 0.25 + 0.75 * lit  # 0.25 shadow floor
        col = mix(MOON_DARK, MOON, t)
        if c in dim:
            col = mix(col, MOON_DARK, 0.18)
        g.append(f'<path d="{path(hex_pts(*c, s * 0.93))}" fill="{col}"/>')
    g.append("</g>")
    # honey cell plus an uneven drip: one long run off the lower-right of the bottom corner
    # that bends slightly and swells into a lopsided drop,
    hx, hy = honey
    k = s * 0.93
    P = lambda x, y: f"{hx + x * k:.2f} {hy + y * k:.2f}"
    drip_d = (f"M{P(-0.18, 0.896)} C{P(-0.04, 1.06)} {P(0.06, 1.24)} {P(0.07, 1.55)} "
            f"C{P(0.08, 1.78)} {P(0.02, 1.95)} {P(0.03, 2.08)} "
            f"C{P(0.04, 2.44)} {P(0.58, 2.48)} {P(0.52, 2.06)} "
            f"C{P(0.49, 1.84)} {P(0.35, 1.64)} {P(0.36, 1.40)} "
            f"C{P(0.37, 1.12)} {P(0.47, 0.90)} {P(0.60, 0.654)} Z")
    drips = (drip_d,) if drip else ()
    for d in drips:  # outline first, then a fill-only copy hides the seam where the drip meets the cell
        g.append(f'<path d="{d}" fill="{HONEY}" stroke="{GAP}" stroke-width="{s*0.09:.2f}" stroke-linejoin="round"/>')
    for d in drips:
        g.append(f'<path d="{d}" fill="{HONEY}"/>')
    g.append(f'<path d="{path(hex_pts(*honey, k))}" fill="{HONEY}"/>')
    return "\n".join(g)

LEG = "#9AA1AB"

def legs(cx, cy, r, sw):
    """Lander legs, kept short and close to the body so they read as part of the moon.
    Three legs (centre one shorter, as if seen in perspective), no struts, small pads."""
    out = []
    # same material as the moon: lit from upper left like the cells, outlined with the comb-wall colour
    shade = {-1: 0.72, 0: 0.45, 1: 0.28}
    for side, a_deg, reach, drop in ((0, 0, 0.0, 1.20), (-1, 38, 0.80, 1.30), (1, 38, 0.80, 1.30)):
        a = math.radians(a_deg)
        hx, hy = cx + side * r * math.sin(a), cy + r * math.cos(a) - sw * 0.6
        fx, fy = cx + side * r * reach, cy + r * drop
        pad = r * (0.13 if side else 0.10)
        d = f"M{hx:.2f} {hy:.2f} L{fx:.2f} {fy:.2f} M{fx - pad:.2f} {fy:.2f} L{fx + pad:.2f} {fy:.2f}"
        col = mix(MOON_DARK, MOON, shade[side])
        for width, colour in ((sw + 2.2, GAP), (sw, col)):
            out.append(f'<path d="{d}" stroke="{colour}" stroke-width="{width:.2f}" stroke-linecap="round" '
                       f'stroke-linejoin="round" fill="none"/>')
    return "\n".join(out)

def svg(w, h, body, bg=None):
    rect = f'<rect width="{w}" height="{h}" rx="{w*0.22:.1f}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
            f'<!-- SI: drafted with Claude (Anthropic), reviewed by Team ShabuShabu -->\n{rect}\n{body}\n</svg>\n')

def build(drip):
    """All logo files; drip=False gives the plain honey cell. Returns {filename: svg}."""
    sfx = "" if drip else "_nodrip"
    wordmark = lambda c: f'\n<text x="140" y="80" font-family="Arial, Helvetica, sans-serif" font-size="40" letter-spacing="9" fill="{c}">HONEYMOON</text>'
    word, word_light = wordmark(INK), wordmark(NAVY)  # light text for dark backgrounds, navy text for light ones
    return {
        f"honeymoon_mark{sfx}.svg": svg(128, 128, moon(64, 64, 56, 12, "m", drip)),
        f"honeymoon_icon{sfx}.svg": svg(128, 128, moon(64, 64, 46, 10.5, "i", drip), bg=NAVY),
        f"honeymoon_lockup{sfx}.svg": svg(520, 128, moon(64, 64, 52, 11.2, "l", drip) + word),
        f"honeymoon_lockup_onlight{sfx}.svg": svg(520, 128, moon(64, 64, 52, 11.2, "l", drip) + word_light),
        # lander versions: moon raised and shrunk so the legs fit
        f"honeymoon_lander_mark{sfx}.svg": svg(128, 128, legs(64, 56, 46, 5.6) + moon(64, 56, 46, 10, "lm", drip)),
        f"honeymoon_lander_icon{sfx}.svg": svg(128, 128, legs(64, 56, 38, 5.2) + moon(64, 56, 38, 8.6, "li", drip), bg=NAVY),
        f"honeymoon_lander_lockup{sfx}.svg": svg(520, 128, legs(64, 56, 44, 5.4) + moon(64, 56, 44, 9.8, "ll", drip) + word),
        f"honeymoon_lander_lockup_onlight{sfx}.svg": svg(520, 128, legs(64, 56, 44, 5.4) + moon(64, 56, 44, 9.8, "ll", drip) + word_light),
    }

def main():
    for drip in (True, False):
        for name, text in build(drip).items():
            with open(os.path.join(OUT, name), "w") as f:
                f.write(text)
            print("wrote", name)

if __name__ == "__main__":
    main()
