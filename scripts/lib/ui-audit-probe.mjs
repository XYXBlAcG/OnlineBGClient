export function probePage() {
  const clickableSelector =
    'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="option"], [role="switch"], [role="slider"], [contenteditable], label';
  const hiddenTags = new Set([
    "SCRIPT",
    "STYLE",
    "LINK",
    "META",
    "NOSCRIPT",
    "TEMPLATE",
  ]);
  const positionedValues = ["fixed", "absolute", "sticky"];
  const hiddenOverflow = ["hidden", "clip"];
  const scrollOverflow = ["auto", "scroll"];

  const classNames = (element) => {
    const raw = typeof element.className === "string" ? element.className : "";
    return raw.trim().split(/\s+/).filter(Boolean);
  };

  const selectorOf = (element) => {
    if (!element || element.nodeType !== 1) return null;
    const id = element.id && !element.id.includes(":") ? `#${element.id}` : "";
    const classes = classNames(element)
      .slice(0, 4)
      .map((name) => `.${name}`)
      .join("");
    const guideTarget = element.getAttribute("data-guide-target");
    const actionName = element.getAttribute("data-action");
    const testId = element.getAttribute("data-testid");
    const marker = guideTarget
      ? `[data-guide-target="${guideTarget}"]`
      : actionName
        ? `[data-action="${actionName}"]`
        : testId
          ? `[data-testid="${testId}"]`
          : "";
    return `${element.tagName.toLowerCase()}${id}${classes}${marker}`;
  };

  const textOf = (element) =>
    (element.innerText || element.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);

  const rectArray = (rect) => [
    Math.round(rect.left),
    Math.round(rect.top),
    Math.round(rect.width),
    Math.round(rect.height),
  ];

  const describe = (element) => {
    const role = element.getAttribute("role");
    return {
      selector: selectorOf(element),
      tag: element.tagName.toLowerCase(),
      role: role || null,
      testId: element.getAttribute("data-testid") || null,
      dataAction: element.getAttribute("data-action") || null,
      dataGuideTarget: element.getAttribute("data-guide-target") || null,
      ariaLabel:
        (element.getAttribute("aria-label") || "").trim().slice(0, 40) || null,
      text: textOf(element),
      children: element.children.length,
      buttonish:
        element.tagName === "BUTTON" ||
        element.tagName === "A" ||
        role === "button",
    };
  };

  const inClosedDetails = (element) => {
    const details = element.closest("details");
    if (!details || details.open) return false;
    const summary = details.querySelector(":scope > summary");
    return !(summary && (element === summary || summary.contains(element)));
  };

  const isVisible = (element) => {
    if (inClosedDetails(element)) return false;
    if (element.closest("[hidden]")) return false;
    if (element.getClientRects().length === 0) return false;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (style.visibility === "collapse") return false;
    return Number(style.opacity) > 0;
  };

  const isDisabled = (element) =>
    element.matches(":disabled") ||
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true" ||
    Boolean(element.closest("fieldset[disabled]"));

  const intersectsViewport = (rect) =>
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < innerWidth &&
    rect.top < innerHeight;

  const paddingBox = (element, rect) => ({
    left: rect.left + element.clientLeft,
    top: rect.top + element.clientTop,
    right: rect.left + element.clientLeft + element.clientWidth,
    bottom: rect.top + element.clientTop + element.clientHeight,
  });

  const containsRect = (box, rect) =>
    rect.left >= box.left - 1 &&
    rect.top >= box.top - 1 &&
    rect.right <= box.right + 1 &&
    rect.bottom <= box.bottom + 1;

  const clippedByAncestor = (element) => {
    const own = element.getBoundingClientRect();
    for (
      let node = element.parentElement;
      node && node !== document.documentElement;
      node = node.parentElement
    ) {
      const style = getComputedStyle(node);
      if (
        !hiddenOverflow.includes(style.overflowX) &&
        !hiddenOverflow.includes(style.overflowY)
      )
        continue;
      const box = paddingBox(node, node.getBoundingClientRect());
      if (box.right - box.left <= 0 || box.bottom - box.top <= 0) continue;
      if (!containsRect(box, own)) return true;
    }
    return false;
  };

  const hasScrollOwnerBetween = (child, container) => {
    for (
      let node = child.parentElement;
      node && node !== container;
      node = node.parentElement
    ) {
      const style = getComputedStyle(node);
      if (scrollOverflow.includes(style.overflowY)) return true;
    }
    return false;
  };

  const indexSelectors = (descriptors) => {
    const totals = new Map();
    for (const descriptor of descriptors)
      totals.set(
        descriptor.selector,
        (totals.get(descriptor.selector) ?? 0) + 1,
      );
    const seen = new Map();
    return descriptors.map((descriptor) => {
      const total = totals.get(descriptor.selector) ?? 1;
      if (total <= 1) return descriptor;
      const index = (seen.get(descriptor.selector) ?? 0) + 1;
      seen.set(descriptor.selector, index);
      return {
        ...descriptor,
        selector: `${descriptor.selector} [${index}/${total}]`,
      };
    });
  };

  const positioned = [];
  const clipped = [];
  const scrollables = [];
  const clippedCount = { value: 0 };
  const scrollableCount = { value: 0 };

  for (const element of document.querySelectorAll("body *")) {
    if (hiddenTags.has(element.tagName)) continue;
    if (!isVisible(element)) continue;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (positionedValues.includes(style.position)) {
      if (rect.width > 24 && rect.height > 24 && intersectsViewport(rect)) {
        positioned.push({
          element,
          rect,
          selector: selectorOf(element),
          position: style.position,
          zIndex: style.zIndex,
        });
      }
    }
    if (hiddenOverflow.includes(style.overflowY)) {
      if (
        element.clientHeight > 0 &&
        element.scrollHeight > element.clientHeight + 8
      ) {
        clippedCount.value += 1;
        if (intersectsViewport(rect)) {
          const interactive = [];
          for (const child of element.querySelectorAll(clickableSelector)) {
            if (interactive.length >= 5) break;
            if (!isVisible(child)) continue;
            const childRect = child.getBoundingClientRect();
            if (!intersectsViewport(childRect)) continue;
            if (hasScrollOwnerBetween(child, element)) continue;
            const box = paddingBox(element, rect);
            if (containsRect(box, childRect)) continue;
            interactive.push({
              target: describe(child),
              rect: rectArray(childRect),
            });
          }
          clipped.push({
            el: describe(element),
            overflowY: style.overflowY,
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            rect: rectArray(rect),
            hiddenLayerOverflow: Boolean(
              element.querySelector('[aria-hidden="true"]'),
            ),
            interactive,
          });
        }
      }
    } else if (scrollOverflow.includes(style.overflowY)) {
      if (
        element.clientHeight > 0 &&
        element.scrollHeight > element.clientHeight + 2
      ) {
        scrollableCount.value += 1;
        if (intersectsViewport(rect)) {
          scrollables.push({
            el: selectorOf(element),
            overflowY: style.overflowY,
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            rect: rectArray(rect),
          });
        }
      }
    }
  }

  const indexedPositioned = indexSelectors(positioned);
  positioned.splice(0, positioned.length, ...indexedPositioned);

  const overlaps = [];
  for (let i = 0; i < positioned.length; i += 1) {
    for (let j = i + 1; j < positioned.length; j += 1) {
      const a = positioned[i];
      const b = positioned[j];
      if (a.element.contains(b.element) || b.element.contains(a.element))
        continue;
      const width =
        Math.min(a.rect.right, b.rect.right) -
        Math.max(a.rect.left, b.rect.left);
      const height =
        Math.min(a.rect.bottom, b.rect.bottom) -
        Math.max(a.rect.top, b.rect.top);
      if (width <= 0 || height <= 0) continue;
      const area = width * height;
      const smaller = Math.min(
        a.rect.width * a.rect.height,
        b.rect.width * b.rect.height,
      );
      if (area <= 1200 || area <= smaller * 0.15) continue;
      overlaps.push({
        area: Math.round(area),
        ratio: Number((area / smaller).toFixed(3)),
        a: { selector: a.selector, position: a.position, zIndex: a.zIndex },
        b: { selector: b.selector, position: b.position, zIndex: b.zIndex },
      });
    }
  }
  overlaps.sort((left, right) => right.area - left.area);

  const blocked = [];
  let clickableCount = 0;
  for (const element of document.querySelectorAll(clickableSelector)) {
    if (!isVisible(element)) continue;
    if (element.closest("[hidden]")) continue;
    if (isDisabled(element)) continue;
    const style = getComputedStyle(element);
    if (style.pointerEvents === "none") continue;
    const rect = element.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    if (!intersectsViewport(rect)) continue;
    if (clippedByAncestor(element)) continue;
    clickableCount += 1;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = Math.min(innerWidth - 1, Math.max(0, centerX));
    const y = Math.min(innerHeight - 1, Math.max(0, centerY));
    const hit = document.elementFromPoint(x, y);
    if (
      !hit ||
      hit === element ||
      element.contains(hit) ||
      hit.contains(element)
    )
      continue;
    const coverControl = hit.closest(
      "button, a[href], [role=button], [role=tab], [role=option]",
    );
    blocked.push({
      target: describe(element),
      cover: describe(hit),
      stacked:
        Boolean(coverControl) &&
        coverControl !== element &&
        element.parentElement === coverControl.parentElement,
      point: [Math.round(x), Math.round(y)],
      rect: rectArray(rect),
      clamped:
        Math.round(centerX) !== Math.round(x) ||
        Math.round(centerY) !== Math.round(y),
    });
  }

  const indexedClipped = indexSelectors(clipped.map((item) => item.el));
  clipped.forEach((item, index) => {
    item.el = indexedClipped[index];
  });
  const indexedBlocked = indexSelectors(blocked.map((item) => item.target));
  blocked.forEach((item, index) => {
    item.target = indexedBlocked[index];
  });

  clipped.sort(
    (left, right) =>
      right.scrollHeight -
      right.clientHeight -
      (left.scrollHeight - left.clientHeight),
  );
  scrollables.sort(
    (left, right) =>
      right.scrollHeight -
      right.clientHeight -
      (left.scrollHeight - left.clientHeight),
  );

  return {
    viewport: {
      width: innerWidth,
      height: innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    counts: {
      positioned: positioned.length,
      clickable: clickableCount,
      overlaps: overlaps.length,
      blocked: blocked.length,
      clipped: clippedCount.value,
      scrollables: scrollableCount.value,
    },
    overlaps: overlaps.slice(0, 40),
    blocked: blocked.slice(0, 40),
    clipped: clipped.slice(0, 40),
    scrollables: scrollables.slice(0, 40),
    documentOverflow: {
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth > innerWidth + 1,
      overflowY: document.documentElement.scrollHeight > innerHeight + 1,
    },
  };
}
