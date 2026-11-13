const actionPattern =
  /出牌|打出|弃牌|摸牌|购牌|购买|出价|交易|建设|修建|移动|攻击|使用|发动|确认|确定|取消|开始|准备|加入|继续|结束|跳过|下一|提交|保存|选择|掷|抽|回应|行动|操作|play|pass|draw|discard|confirm|cancel|start|ready|join|end|skip|next|submit|save|move|attack|buy|use|act/i;

const categoryLabels = {
  blocked: "点击遮挡",
  clipped: "裁切",
  overlap: "定位重叠",
  overflow: "文档溢出",
};

const categoryOrder = ["blocked", "clipped", "overlap", "overflow"];
const severityOrder = { P0: 0, P1: 1, P2: 2 };

const emptyCounts = () => ({ P0: 0, P1: 0, P2: 0, total: 0 });

const normalizeSelector = (selector) =>
  String(selector ?? "")
    .replace(/(^|[^\w-])#\d+/g, "$1#")
    .replace(/\s+/g, " ")
    .trim();

const isActionTarget = (descriptor) =>
  actionPattern.test(
    [
      descriptor.text,
      descriptor.ariaLabel,
      descriptor.dataAction,
      descriptor.dataGuideTarget,
      descriptor.testId,
      descriptor.selector,
    ]
      .filter(Boolean)
      .join(" "),
  );

const describeTarget = (descriptor) =>
  `${descriptor.selector}${descriptor.text ? ` "${descriptor.text}"` : ""}`;

export function classifyScreen(screen) {
  const base = {
    game: screen.game,
    viewport: screen.viewport,
    screenshot: screen.screenshot,
  };
  const findings = [];
  for (const item of screen.probe.overlaps) {
    const pair = [
      normalizeSelector(item.a.selector),
      normalizeSelector(item.b.selector),
    ].sort();
    findings.push({
      ...base,
      severity: "P2",
      category: "overlap",
      fingerprint: `${base.game}|${base.viewport}|overlap|${pair.join("|")}`,
      title: `${item.a.selector} 与 ${item.b.selector} 重叠 ${Math.round(item.ratio * 100)}%（${item.area}px²）`,
      selectors: [item.a.selector, item.b.selector],
      note: "两者均为 fixed/absolute/sticky 且非父子，交集面积 > 1200px² 且 > 较小者 15%",
      detail: item,
    });
  }
  for (const item of screen.probe.blocked) {
    const actionable = item.target.buttonish && isActionTarget(item.target);
    findings.push({
      ...base,
      severity: actionable ? "P0" : "P1",
      category: "blocked",
      fingerprint: `${base.game}|${base.viewport}|blocked|${normalizeSelector(item.target.selector)}|${normalizeSelector(item.cover.selector)}`,
      title: `${describeTarget(item.target)} 中心点 (${item.point[0]}, ${item.point[1]}) 被 ${item.cover.selector} 遮挡`,
      selectors: [item.target.selector, item.cover.selector],
      note: actionable
        ? "操作类按钮被遮挡，判 P0"
        : "无法判定为主操作按钮，归 P1",
      detail: item,
    });
  }
  for (const item of screen.probe.clipped) {
    const actionable = item.interactive.filter(
      (child) => child.target.buttonish && isActionTarget(child.target),
    );
    const note = actionable.length
      ? "操作类按钮越界，判 P0"
      : item.interactive.length
        ? "交互元素越界但无法判定为操作类，归 P1（若属关键操作/手牌区需人工升级）"
        : item.hiddenLayerOverflow
          ? "溢出疑似来自 aria-hidden 隐藏层（可能为设计内动画），归 P1，需人工复核"
          : item.el.children === 0
            ? "文本截断（无交互子元素），归 P1"
            : "内容被裁切（无交互子元素），归 P1";
    findings.push({
      ...base,
      severity: actionable.length ? "P0" : "P1",
      category: "clipped",
      fingerprint: `${base.game}|${base.viewport}|clipped|${normalizeSelector(item.el.selector)}|${item.overflowY}`,
      title: `${item.el.selector} 纵向裁切 ${item.scrollHeight - item.clientHeight}px（scrollHeight ${item.scrollHeight} / clientHeight ${item.clientHeight}，overflow-y: ${item.overflowY}）`,
      selectors: [
        item.el.selector,
        ...item.interactive.map((child) => child.target.selector),
      ],
      note,
      detail: item,
    });
  }
  const overflow = screen.probe.documentOverflow;
  if (overflow.overflowX || overflow.overflowY) {
    findings.push({
      ...base,
      severity: "P2",
      category: "overflow",
      fingerprint: `${base.game}|${base.viewport}|overflow|document`,
      title: `文档滚动溢出：${overflow.scrollWidth}×${overflow.scrollHeight} > 视口 ${overflow.width}×${overflow.height}`,
      selectors: ["html"],
      note: "文档级滚动溢出，归 P2",
      detail: overflow,
    });
  }
  return findings;
}

export function summarize(findings, screens, games, viewports) {
  const totals = emptyCounts();
  const byGame = Object.fromEntries(games.map((kind) => [kind, emptyCounts()]));
  const byViewport = Object.fromEntries(
    viewports.map((viewport) => [viewport.key, emptyCounts()]),
  );
  const byGameViewport = Object.fromEntries(
    games.map((kind) => [
      kind,
      Object.fromEntries(
        viewports.map((viewport) => [viewport.key, emptyCounts()]),
      ),
    ]),
  );
  const byCategory = Object.fromEntries(
    categoryOrder.map((category) => [category, emptyCounts()]),
  );
  for (const finding of findings) {
    for (const bucket of [
      totals,
      byGame[finding.game],
      byViewport[finding.viewport],
      byGameViewport[finding.game]?.[finding.viewport],
      byCategory[finding.category],
    ]) {
      if (!bucket) continue;
      bucket[finding.severity] += 1;
      bucket.total += 1;
    }
  }
  const runtime = { pageErrors: 0, consoleErrors: 0 };
  for (const screen of screens) {
    runtime.pageErrors += screen.runtime.pageErrors.length;
    runtime.consoleErrors += screen.runtime.consoleErrors.length;
  }
  return {
    totals,
    byGame,
    byViewport,
    byGameViewport,
    byCategory,
    runtime,
    screens: {
      total: screens.length,
      failed: screens.filter((screen) => screen.status !== "ok").length,
    },
  };
}

const baselineKey = (entry) => entry.fingerprint ?? entry.id;

export function compareBaseline(findings, baselineFindings) {
  const current = new Map(
    findings.map((finding) => [baselineKey(finding), finding]),
  );
  const previous = new Map(
    baselineFindings.map((entry) => [baselineKey(entry), entry]),
  );
  return {
    added: [...current.values()].filter(
      (finding) => !previous.has(baselineKey(finding)),
    ),
    removed: [...previous.values()].filter(
      (entry) => !current.has(baselineKey(entry)),
    ),
    persisted: [...current.values()].filter((finding) =>
      previous.has(baselineKey(finding)),
    ).length,
  };
}

const mdCell = (value) =>
  String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .trim();

const entryElement = (entry) =>
  entry.element ?? (entry.selectors ?? []).join(" / ");

const entryTitle = (entry) =>
  entry.title ??
  `${categoryLabels[entry.category] ?? entry.category}：${entryElement(entry)}`;

const sortFindings = (findings) =>
  [...findings].sort(
    (left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity] ||
      categoryOrder.indexOf(left.category) -
        categoryOrder.indexOf(right.category) ||
      entryTitle(left).localeCompare(entryTitle(right)),
  );

const countsCell = (counts) =>
  counts ? `${counts.P0}/${counts.P1}/${counts.P2}` : "—";

const formatTime = (value) => {
  if (!value) return "未知";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("zh-CN", { hour12: false });
};

const findingRow = (finding) =>
  `| ${finding.severity} | ${categoryLabels[finding.category] ?? finding.category} | ${mdCell(finding.selectors.join(" / ")).slice(0, 180)} | ${mdCell(`${finding.title}${finding.note ? `；${finding.note}` : ""}`).slice(0, 220)} |`;

const baselineRows = (findings) =>
  sortFindings(findings).map(
    (entry) =>
      `| ${entry.severity} | ${categoryLabels[entry.category] ?? entry.category} | ${entry.game} | ${entry.viewport} | ${mdCell(entryElement(entry)).slice(0, 180)} | ${mdCell(entryTitle(entry)).slice(0, 200)} |`,
  );

export function renderMarkdown(report) {
  const { summary, screens, findings, baseline, selection } = report;
  const lines = [
    "# UI 自动审计报告",
    "",
    `生成时间：${formatTime(report.generatedAt)}`,
    "",
    `- 命令：\`${report.command}\``,
    `- 游戏清单来源：\`${report.catalogueSource}\`（${selection.games.length} 款）`,
    `- 视口：${selection.viewports.map((viewport) => `${viewport.label} ${viewport.width}×${viewport.height}`).join("、")}`,
    `- 夹具：${report.fixtures.note}；AI 延迟 ${report.fixtures.aiDelayMs}ms`,
    `- 截图目录：\`artifacts/ui-audit/screenshots/\``,
    `- 静态资源：\`${report.build.hostingEntry}\` ${formatTime(report.build.hostingEntryMtime)}｜\`${report.build.hostingIndex}\` ${formatTime(report.build.hostingIndexMtime)}`,
    `- 基线：${baseline ? `\`${baseline.path}\`（新增 ${baseline.added.length} / 消失 ${baseline.removed.length} / 沿用 ${baseline.persisted}）` : "未使用基线"}`,
    "",
    "## 分级说明",
    "",
    "| 级别 | 含义 |",
    "| --- | --- |",
    "| P0 阻断 | 操作类按钮被点击遮挡，或操作类按钮所在容器裁切导致不可达 |",
    "| P1 严重 | 其余点击遮挡、裁切；无法判定为操作类时按 P1 并标注原因 |",
    "| P2 提示 | 定位元素重叠、文档滚动越界 |",
    "",
    "运行时错误（pageerror / console error）单独记录，不计入 P0/P1/P2。",
    "",
    "## 总览",
    "",
    `| 游戏 | 席位 | ${selection.viewports.map((viewport) => `${viewport.label} P0/P1/P2`).join(" | ")} | 合计 P0/P1/P2 |`,
    `| --- | ---: | ${selection.viewports.map(() => "---:").join(" | ")} | ---: |`,
  ];
  for (const game of selection.games) {
    lines.push(
      `| ${game.kind} ${mdCell(game.name)} | ${game.seats} | ${selection.viewports.map((viewport) => countsCell(summary.byGameViewport[game.kind][viewport.key])).join(" | ")} | ${countsCell(summary.byGame[game.kind])} |`,
    );
  }
  lines.push(
    `| 合计 | — | ${selection.viewports.map((viewport) => countsCell(summary.byViewport[viewport.key])).join(" | ")} | ${countsCell(summary.totals)} |`,
    "",
    `汇总：${summary.totals.total} 个问题（P0 ${summary.totals.P0} / P1 ${summary.totals.P1} / P2 ${summary.totals.P2}）；` +
      `截图 ${screens.length} 屏（失败 ${summary.screens.failed} 屏）；` +
      `运行时 pageerror ${summary.runtime.pageErrors}、console error ${summary.runtime.consoleErrors}。`,
    "",
    "## 基线对比",
    "",
  );
  if (!baseline) {
    lines.push("未使用基线：本次仅运行并报告，不因历史问题失败。", "");
  } else if (!baseline.added.length && !baseline.removed.length) {
    lines.push(
      `与基线一致，无新增或消失问题（沿用 ${baseline.persisted} 个）。`,
      "",
    );
  } else {
    lines.push(
      `新增 ${baseline.added.length} 个（P0 ${baseline.added.filter((item) => item.severity === "P0").length} / P1 ${baseline.added.filter((item) => item.severity === "P1").length} / P2 ${baseline.added.filter((item) => item.severity === "P2").length}），消失 ${baseline.removed.length} 个。`,
      "",
      "### 新增问题",
      "",
    );
    if (!baseline.added.length) lines.push("无新增问题。", "");
    else {
      lines.push(
        "| 级别 | 类型 | 游戏 | 视口 | 元素 | 说明 |",
        "| --- | --- | --- | --- | --- | --- |",
        ...baselineRows(baseline.added),
        "",
      );
    }
    lines.push("### 消失问题", "");
    if (!baseline.removed.length) lines.push("无消失问题。", "");
    else {
      lines.push(
        "| 级别 | 类型 | 游戏 | 视口 | 元素 | 说明 |",
        "| --- | --- | --- | --- | --- | --- |",
        ...baselineRows(baseline.removed),
        "",
      );
    }
  }
  lines.push("## 问题明细", "");
  for (const game of selection.games) {
    lines.push(
      `### ${game.kind} ${mdCell(game.name)}（席位 ${game.seats}）`,
      "",
    );
    for (const viewport of selection.viewports) {
      const screen = screens.find(
        (item) => item.game === game.kind && item.viewport === viewport.key,
      );
      if (!screen) continue;
      lines.push(
        `#### ${viewport.label} ${viewport.width}×${viewport.height}`,
        "",
      );
      const overflow = screen.probe?.documentOverflow;
      lines.push(
        `截图：![${game.kind} ${viewport.label}](${screen.screenshot})`,
        "",
        `- 文档滚动：${overflow && (overflow.overflowX || overflow.overflowY) ? `溢出（${overflow.scrollWidth}×${overflow.scrollHeight} > ${overflow.width}×${overflow.height}）` : "无溢出"}`,
        `- 可滚动容器：${screen.probe?.counts.scrollables ?? 0} 个（仅记录，不算裁切）`,
        `- 运行时错误：pageerror ${screen.runtime.pageErrors.length}、console error ${screen.runtime.consoleErrors.length}`,
        screen.status === "ok" ? "" : `- 采集失败：${mdCell(screen.error)}`,
      );
      const screenFindings = sortFindings(
        findings.filter(
          (item) => item.game === game.kind && item.viewport === viewport.key,
        ),
      );
      if (!screenFindings.length) {
        lines.push("机器判定未发现该屏问题。", "");
        continue;
      }
      const shown = screenFindings.slice(0, 60);
      lines.push(
        "| 级别 | 类型 | 元素 | 说明 |",
        "| --- | --- | --- | --- |",
        ...shown.map(findingRow),
        "",
      );
      if (screenFindings.length > shown.length) {
        lines.push(
          `其余 ${screenFindings.length - shown.length} 条见 \`artifacts/ui-audit/report.json\`。`,
          "",
        );
      }
    }
  }
  lines.push("## 运行时错误", "");
  const runtimeRows = [];
  for (const screen of screens) {
    for (const message of screen.runtime.pageErrors) {
      runtimeRows.push(
        `| ${screen.game} | ${screen.viewport} | pageerror | ${mdCell(message)} |`,
      );
    }
    for (const message of screen.runtime.consoleErrors) {
      runtimeRows.push(
        `| ${screen.game} | ${screen.viewport} | console error | ${mdCell(message)} |`,
      );
    }
  }
  if (!runtimeRows.length) lines.push("无运行时错误。", "");
  else {
    lines.push(
      "| 游戏 | 视口 | 类型 | 信息 |",
      "| --- | --- | --- | --- |",
      ...runtimeRows.slice(0, 80),
      "",
    );
    if (runtimeRows.length > 80)
      lines.push(
        `其余 ${runtimeRows.length - 80} 条见 \`artifacts/ui-audit/report.json\`。`,
        "",
      );
  }
  return `${lines.join("\n")}\n`;
}
