export interface TableSample {
  node: Element;
  bounds: DOMRect;
  copy: Element;
  key: string | null;
  hand: boolean;
  small: string | null;
  zone: string | null;
}
let serial = 0;
const references = (root: Element) =>
  [root, ...root.querySelectorAll("*")].flatMap((node) =>
    [...node.attributes].flatMap((attr) =>
      [...attr.value.matchAll(/url\(#([^)]*)\)|^#(.+)$/g)].map(
        (match) => match[1] || match[2],
      ),
    ),
  );

export function sampleTable(surface: Element): TableSample[] {
  return [
    ...surface.querySelectorAll(
      '[data-motion-key],[data-motion-zone],[data-game-avatar],[data-guide-target="dy.pot"]',
    ),
  ].flatMap((node) => {
    const bounds = node.getBoundingClientRect();
    if (!bounds.width || !bounds.height || node.closest('[aria-hidden="true"]'))
      return [];
    let copy: Element;
    if (node instanceof SVGGraphicsElement) {
      const matrix = node.getScreenCTM();
      if (!matrix) return [];
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
      const defs = document.createElementNS(svg.namespaceURI, "defs"),
        needed = references(node),
        seen = new Set<string>();
      while (needed.length) {
        const id = needed.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        const definition = [
          ...node.ownerSVGElement!.querySelectorAll("defs [id]"),
        ].find((element) => element.id === id);
        if (definition) {
          defs.append(definition.cloneNode(true));
          needed.push(...references(definition));
        }
      }
      if (defs.childElementCount) svg.append(defs);
      const group = document.createElementNS(svg.namespaceURI, "g");
      group.setAttribute(
        "transform",
        `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e - bounds.x} ${matrix.f - bounds.y})`,
      );
      const glyph = node.cloneNode(true) as SVGGraphicsElement;
      glyph.removeAttribute("transform");
      if (node instanceof SVGUseElement) {
        glyph.setAttribute("x", String(node.x.animVal.value));
        glyph.setAttribute("y", String(node.y.animVal.value));
      }
      glyph
        .querySelectorAll("animate,animateTransform")
        .forEach((n) => n.remove());
      group.append(glyph);
      svg.append(group);
      copy = svg;
      const prefix = `motion-${++serial}-`,
        ids = new Map<string, string>();
      svg.querySelectorAll("[id]").forEach((n) => {
        const id = n.id;
        ids.set(id, prefix + id);
        n.id = prefix + id;
      });
      for (const n of svg.querySelectorAll("*"))
        for (const attr of [...n.attributes]) {
          const value = attr.value.replace(
            /url\(#([^)]*)\)|^#(.+)$/g,
            (match, url, href) => {
              const alias = ids.get(url || href);
              return alias ? (url ? `url(#${alias})` : `#${alias}`) : match;
            },
          );
          if (value !== attr.value)
            n.setAttributeNS(attr.namespaceURI, attr.name, value);
        }
    } else {
      copy = node.cloneNode(true) as HTMLElement;
      copy.removeAttribute("id");
      copy.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      const content = copy as HTMLElement,
        unscaled = (node as HTMLElement).offsetWidth;
      Object.assign(content.style, {
        position: "absolute",
        left: "0",
        top: "0",
        margin: "0",
        transformOrigin: "top left",
        transform: `scale(${unscaled ? bounds.width / unscaled : 1})`,
        opacity: "1",
      });
    }
    return [
      {
        node,
        bounds,
        copy,
        key: node.getAttribute("data-motion-key"),
        hand:
          !node.closest('[data-motion-zone="ddz.public"]') &&
          !!node.closest(
            '.scmj-hand,.uno-list,.sgs-card-list,.ddz-poker-list,[data-guide-target="dy.hand"]',
          ),
        small: node.getAttribute("data-guide-small"),
        zone:
          node
            .closest("[data-motion-zone]")
            ?.getAttribute("data-motion-zone") || null,
      },
    ];
  });
}
export function findSample(
  samples: TableSample[],
  selector: string,
): TableSample | undefined {
  const key = selector.match(/data-motion-key="([^"]+)"/)?.[1];
  if (!key) return samples.find((sample) => sample.node.matches(selector));
  const zone = selector.match(/data-motion-zone="([^"]+)"/)?.[1];
  const small = selector.match(/data-guide-small="([^"]+)"/)?.[1];
  const own =
    selector.includes("scmj-hand") ||
    selector.includes("uno-list") ||
    selector.includes("sgs-card-list") ||
    selector.includes("ddz-poker-list") ||
    selector.includes("dy.hand");
  return samples.find(
    (sample) =>
      sample.key === key &&
      (!zone || sample.zone === zone) &&
      (!small || sample.small === small) &&
      (!own || sample.hand),
  );
}
