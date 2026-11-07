#!/usr/bin/env python3

from __future__ import annotations

import argparse
import concurrent.futures
import json
import math
import os
import random
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Any, Callable


ROOT = Path(__file__).resolve().parents[1]
DIFFICULTY_NAMES = {
    "story": "旅途",
    "standard": "标准",
    "challenge": "挑战",
}
DIFFICULTY_COLORS = {
    "story": "#3a8f72",
    "standard": "#4169aa",
    "challenge": "#b44d46",
}


def parse_ints(value: str) -> list[int]:
    values: list[int] = []
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start, end = (int(item) for item in part.split("-", 1))
            values.extend(range(start, end + 1))
        else:
            values.append(int(part))
    return sorted(set(values))


def parse_strings(value: str) -> list[str]:
    return [part.strip() for part in value.split(",") if part.strip()]


def rounded(value: float, digits: int = 1) -> float:
    return round(value, digits)


def percentile(values: list[float], ratio: float) -> float:
    if not values:
        return 0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, math.floor((len(ordered) - 1) * ratio)))
    return ordered[index]


def cvar(values: list[float], alpha: float = 0.25) -> float:
    if not values:
        return 0
    count = max(1, math.ceil(len(values) * alpha))
    worst = sorted(values)[:count]
    return -mean(worst)


def escape_xml(value: Any) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def run_worker(
    node: str,
    config: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    command = [
        node,
        str(ROOT / "scripts" / "expedition-difficulty-worker.mjs"),
        json.dumps(config, ensure_ascii=False, separators=(",", ":")),
    ]
    completed = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if completed.returncode:
        raise RuntimeError(
            f"worker failed: {config}\n{completed.stderr}\n{completed.stdout}"
        )
    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError(
            f"worker returned invalid JSON: {config}\n{completed.stdout}"
        ) from error
    return config, payload["runs"]


def summarize(
    runs: list[dict[str, Any]],
    difficulties: list[str],
    ascensions: list[int],
    players_list: list[int],
) -> list[dict[str, Any]]:
    groups: dict[tuple[str, int, int], list[dict[str, Any]]] = defaultdict(list)
    for run in runs:
        groups[
            (run["difficulty"], int(run["ascension"]), int(run["players"]))
        ].append(run)

    summaries: list[dict[str, Any]] = []
    for difficulty in difficulties:
        for ascension in ascensions:
            for players in players_list:
                group = groups[(difficulty, ascension, players)]
                if not group:
                    continue
                utilities = [float(run["score"]["utility"]) for run in group]
                losses = [run for run in group if not run["won"]]
                wins = sum(1 for run in group if run["won"])
                summaries.append(
                    {
                        "difficulty": difficulty,
                        "difficultyName": DIFFICULTY_NAMES[difficulty],
                        "ascension": ascension,
                        "players": players,
                        "runs": len(group),
                        "wins": wins,
                        "winRate": rounded(wins / len(group), 3),
                        "stalled": sum(1 for run in group if run["stalled"]),
                        "reward": rounded(
                            mean(float(run["score"]["reward"]) for run in group)
                        ),
                        "risk": rounded(
                            mean(float(run["score"]["risk"]) for run in group)
                        ),
                        "utility": rounded(mean(utilities)),
                        "cvar": rounded(cvar(utilities)),
                        "progress": rounded(
                            mean(float(run["progress"]) for run in group)
                        ),
                        "progressP50": percentile(
                            [float(run["progress"]) for run in group], 0.5
                        ),
                        "progressP90": percentile(
                            [float(run["progress"]) for run in group], 0.9
                        ),
                        "healthRatio": rounded(
                            mean(
                                (
                                    float(run["heroHp"]) / float(run["heroMaxHp"])
                                    if run["heroMaxHp"]
                                    else 0
                                )
                                for run in group
                            ),
                            3,
                        ),
                        "healthLost": rounded(
                            mean(float(run["healthLost"]) for run in group)
                        ),
                        "rounds": rounded(
                            mean(float(run["rounds"]) for run in group)
                        ),
                        "battles": rounded(
                            mean(float(run["battlesWon"]) for run in group)
                        ),
                        "relics": rounded(
                            mean(float(run["relics"]) for run in group)
                        ),
                        "cards": rounded(
                            mean(float(run["cards"]) for run in group)
                        ),
                        "upgrades": rounded(
                            mean(float(run["upgrades"]) for run in group)
                        ),
                        "gold": rounded(
                            mean(float(run["gold"]) for run in group)
                        ),
                        "companions": rounded(
                            mean(float(run["companions"]) for run in group)
                        ),
                        "shopSealed": rounded(
                            sum(1 for run in group if run["shopSealed"])
                            / len(group),
                            3,
                        ),
                        "lossProgress": rounded(
                            mean(float(run["progress"]) for run in losses)
                            if losses
                            else 0
                        ),
                        "elapsedMs": rounded(
                            mean(float(run["elapsedMs"]) for run in group), 0
                        ),
                    }
                )
    return summaries


def line_chart(
    summaries: list[dict[str, Any]],
    difficulties: list[str],
    ascensions: list[int],
    players_list: list[int],
    value: Callable[[dict[str, Any]], float],
    title: str,
    suffix: str = "",
    maximum: float | None = None,
    minimum: float | None = None,
) -> str:
    width, height, padding = 980, 470, 62
    values = [value(item) for item in summaries]
    max_value = maximum if maximum is not None else max(values + [1])
    min_value = minimum if minimum is not None else min(values + [0])
    value_range = max(1.0, max_value - min_value)

    def x(ascension: int) -> float:
        return padding + (ascension / max(1, max(ascensions))) * (
            width - padding * 2
        )

    def y(number: float) -> float:
        return (
            height
            - padding
            - ((number - min_value) / value_range) * (height - padding * 2)
        )

    grid: list[str] = []
    for index in range(6):
        ratio = index / 5
        gy = height - padding - ratio * (height - padding * 2)
        grid_value = min_value + ratio * value_range
        grid.append(
            f'<line x1="{padding}" y1="{gy:.1f}" x2="{width - padding}" '
            f'y2="{gy:.1f}" stroke="#dfe4e1"/>'
            f'<text x="{padding - 10}" y="{gy + 4:.1f}" text-anchor="end" '
            f'font-size="10">{grid_value:.0f}{suffix}</text>'
        )

    series: list[str] = []
    for difficulty in difficulties:
        for player_index, players in enumerate(players_list):
            rows = sorted(
                (
                    item
                    for item in summaries
                    if item["difficulty"] == difficulty
                    and item["players"] == players
                ),
                key=lambda item: item["ascension"],
            )
            dash = ' stroke-dasharray="8 5"' if player_index else ""
            points = " ".join(
                f"{x(item['ascension']):.1f},{y(value(item)):.1f}"
                for item in rows
            )
            color = DIFFICULTY_COLORS[difficulty]
            series.append(
                f'<polyline fill="none" stroke="{color}" stroke-width="3"{dash} '
                f'points="{points}"/>'
            )
            series.extend(
                f'<circle cx="{x(item["ascension"]):.1f}" '
                f'cy="{y(value(item)):.1f}" r="4" fill="{color}"/>'
                for item in rows
            )

    x_labels = "".join(
        f'<text x="{x(ascension):.1f}" y="{height - padding + 22}" '
        f'text-anchor="middle" font-size="10">N{ascension}</text>'
        for ascension in ascensions
    )
    legend = "".join(
        f'<circle cx="{padding + 100 + index * 100}" cy="24" r="5" '
        f'fill="{DIFFICULTY_COLORS[difficulty]}"/>'
        f'<text x="{padding + 111 + index * 100}" y="28" font-size="12">'
        f"{DIFFICULTY_NAMES[difficulty]}</text>"
        for index, difficulty in enumerate(difficulties)
    )
    player_legend = " · ".join(
        f"{players}人 {'虚线' if index else '实线'}"
        for index, players in enumerate(players_list)
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'role="img" aria-label="{escape_xml(title)}">'
        f'<rect width="{width}" height="{height}" fill="#f8f6f0"/>'
        f'{"".join(grid)}{"".join(series)}'
        f'<line x1="{padding}" y1="{height - padding}" x2="{width - padding}" '
        f'y2="{height - padding}" stroke="#59645f"/>'
        f'<line x1="{padding}" y1="{padding}" x2="{padding}" '
        f'y2="{height - padding}" stroke="#59645f"/>'
        f"{x_labels}{legend}"
        f'<text x="{width - padding}" y="28" text-anchor="end" font-size="10">'
        f"{player_legend}</text></svg>"
    )


def matrix_chart(
    summaries: list[dict[str, Any]],
    difficulties: list[str],
    ascensions: list[int],
    players: int,
    metric: Callable[[dict[str, Any]], float],
    display: Callable[[float], str],
    title: str,
) -> str:
    width, cell_width, cell_height, left, top = 1040, 78, 50, 95, 48
    height = top + len(difficulties) * cell_height + 30
    rows = [
        item
        for item in summaries
        if item["players"] == players
    ]
    maximum = max((metric(item) for item in rows), default=0.001)
    pieces = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'role="img" aria-label="{escape_xml(title)}">',
        f'<rect width="{width}" height="{height}" fill="#f8f6f0"/>',
    ]
    pieces.extend(
        f'<text x="{left + index * cell_width + cell_width / 2}" y="28" '
        f'text-anchor="middle" font-size="11">N{ascension}</text>'
        for index, ascension in enumerate(ascensions)
    )
    for row_index, difficulty in enumerate(difficulties):
        pieces.append(
            f'<text x="{left - 12}" y="{top + row_index * cell_height + 31}" '
            f'text-anchor="end" font-size="12">'
            f"{DIFFICULTY_NAMES[difficulty]}</text>"
        )
        for column, ascension in enumerate(ascensions):
            item = next(
                (
                    candidate
                    for candidate in summaries
                    if candidate["difficulty"] == difficulty
                    and candidate["ascension"] == ascension
                    and candidate["players"] == players
                ),
                None,
            )
            raw = metric(item) if item else 0
            alpha = 0.12 + (raw / max(0.001, maximum)) * 0.78
            fill = "#ffffff" if alpha > 0.55 else "#26332f"
            pieces.append(
                f'<rect x="{left + column * cell_width}" '
                f'y="{top + row_index * cell_height}" '
                f'width="{cell_width - 4}" height="{cell_height - 4}" rx="5" '
                f'fill="{DIFFICULTY_COLORS[difficulty]}" '
                f'fill-opacity="{alpha:.3f}"/>'
                f'<text x="{left + column * cell_width + cell_width / 2 - 2}" '
                f'y="{top + row_index * cell_height + 29}" text-anchor="middle" '
                f'font-size="11" fill="{fill}">{escape_xml(display(raw))}</text>'
            )
    pieces.append("</svg>")
    return "".join(pieces)


def build_report(
    summaries: list[dict[str, Any]],
    runs: list[dict[str, Any]],
    difficulties: list[str],
    ascensions: list[int],
    players_list: list[int],
    style: str,
    seed_mode: str,
    seeds: list[int],
    start_seed: int,
) -> str:
    easiest = max(summaries, key=lambda item: item["utility"])
    hardest = min(summaries, key=lambda item: item["utility"])
    win_rows = []
    utility_rows = []
    for difficulty in difficulties:
        win_cells = []
        utility_cells = []
        for ascension in ascensions:
            item = next(
                (
                    candidate
                    for candidate in summaries
                    if candidate["difficulty"] == difficulty
                    and candidate["ascension"] == ascension
                    and candidate["players"] == players_list[0]
                ),
                None,
            )
            win_cells.append(f"{round((item['winRate'] if item else 0) * 100)}%")
            utility_cells.append(str(item["utility"] if item else 0))
        win_rows.append(
            f"| {DIFFICULTY_NAMES[difficulty]} | {' | '.join(win_cells)} |"
        )
        utility_rows.append(
            f"| {DIFFICULTY_NAMES[difficulty]} | {' | '.join(utility_cells)} |"
        )

    anomalies: list[str] = []
    for difficulty in difficulties:
        rows = sorted(
            (
                item
                for item in summaries
                if item["difficulty"] == difficulty
                and item["players"] == players_list[0]
            ),
            key=lambda item: item["ascension"],
        )
        for previous, current in zip(rows, rows[1:]):
            if current["winRate"] > previous["winRate"] + 0.05:
                anomalies.append(
                    f"- {DIFFICULTY_NAMES[difficulty]} N{current['ascension']}："
                    f"胜率从 N{previous['ascension']} 的 "
                    f"{round(previous['winRate'] * 100)}% 回升到 "
                    f"{round(current['winRate'] * 100)}%。"
                )
            if current["utility"] > previous["utility"] + 3:
                anomalies.append(
                    f"- {DIFFICULTY_NAMES[difficulty]} N{current['ascension']}："
                    "综合效用逆势上升。"
                )

    details = "\n".join(
        f"| {item['difficultyName']} | N{item['ascension']} | {item['players']} | "
        f"{item['wins']}/{item['runs']} | {round(item['winRate'] * 100)}% | "
        f"{item['reward']} | {item['risk']} | {item['utility']} | {item['cvar']} | "
        f"{item['progress']} | {item['healthLost']} | {item['rounds']} | "
        f"{item['relics']} |"
        for item in summaries
    )
    ascension_head = " | ".join(f"N{item}" for item in ascensions)
    separator = "|".join("---:" for _ in ascensions)
    return f"""# 秘塔远征 N0–N10 难度报告

生成时间：{datetime.now(timezone.utc).isoformat()}

- AI 策略：`{style}`
- 难度：{"、".join(DIFFICULTY_NAMES[item] for item in difficulties)}
- 阶位：{ascensions[0]}–{ascensions[-1]}
- 玩家人数：{", ".join(map(str, players_list))}
- 种子模式：{"固定" if seed_mode == "fixed" else "随机"}
- 每组种子数：{len(set(run["seed"] for run in runs))}
- 起始种子：{start_seed if seed_mode == "fixed" else "随机生成"}
- 总运行数：{len(runs)}
- 停滞运行：{sum(1 for run in runs if run["stalled"])}

## 胜率矩阵

| 难度 | {ascension_head} |
|---|{separator}|
{chr(10).join(win_rows)}

## 综合效用矩阵

效用 = 收益 − 0.35 × 风险。

| 难度 | {ascension_head} |
|---|{separator}|
{chr(10).join(utility_rows)}

## 图表

### 胜率

![N0-N10 胜率](charts/win-rate.svg)

### 平均推进深度

![N0-N10 平均推进深度](charts/progress.svg)

### 综合效用

![N0-N10 综合效用](charts/utility.svg)

### 风险

![N0-N10 风险](charts/risk.svg)

### 胜率热力图

![胜率热力图](charts/win-rate-matrix.svg)

### 风险热力图

![风险热力图](charts/risk-matrix.svg)

## 详细数据

| 难度 | 阶位 | 人数 | 胜利 | 胜率 | 收益 | 风险 | 效用 | CVaR | 平均推进 | 平均承伤 | 战斗轮数 | 遗物 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
{details}

## 自动结论

- 综合体验最高：{easiest["difficultyName"]} N{easiest["ascension"]}，效用 {easiest["utility"]}。
- 综合体验最低：{hardest["difficultyName"]} N{hardest["ascension"]}，效用 {hardest["utility"]}。

### 非单调或异常回升

{chr(10).join(anomalies) if anomalies else "未检测到超过阈值的胜率或效用逆势上升。"}

## 解释边界

本报告使用公开信息的启发式 AI 和固定种子，不等同于真人胜率。主要用于发现难度断层、非单调阶位、资源膨胀、战斗拖长和路线偏差。真人操作、动画观感与触控体验仍需手动验收。
"""


def main() -> int:
    parser = argparse.ArgumentParser(
        description="并行扫描秘塔远征 N0-N10 与三档难度。",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    amount = parser.add_mutually_exclusive_group()
    amount.add_argument("--seeds", type=int, help="每个难度/阶位组合的局数")
    amount.add_argument("--games", type=int, help="本次运行的总局数")
    parser.add_argument("--start-seed", type=int, default=0)
    parser.add_argument(
        "--seed-mode",
        choices=("fixed", "random"),
        default="fixed",
        help="fixed 使用连续固定种子，random 使用随机种子",
    )
    parser.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 4) - 1))
    parser.add_argument("--players", default="1", help="逗号分隔，例如 1,2,3,4")
    parser.add_argument(
        "--modes",
        default="story,standard,challenge",
        help="story,standard,challenge",
    )
    parser.add_argument("--ascensions", default="0-10")
    parser.add_argument("--style", default="adaptive")
    parser.add_argument("--max-steps", type=int, default=12000)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "artifacts" / "expedition-difficulty-python",
    )
    parser.add_argument("--node", default="node")
    args = parser.parse_args()

    difficulties = parse_strings(args.modes)
    unknown = [item for item in difficulties if item not in DIFFICULTY_NAMES]
    if unknown:
        parser.error(f"未知难度: {', '.join(unknown)}")
    ascensions = parse_ints(args.ascensions)
    if not ascensions or any(item < 0 or item > 10 for item in ascensions):
        parser.error("--ascensions 必须位于 0-10")
    players_list = parse_ints(args.players)
    if not players_list or any(item < 1 or item > 4 for item in players_list):
        parser.error("--players 必须位于 1-4")
    if args.workers < 1:
        parser.error("--workers 必须大于 0")
    if args.seeds is not None and args.seeds < 1:
        parser.error("--seeds 必须大于 0")
    if args.games is not None and args.games < 1:
        parser.error("--games 必须大于 0")

    output = args.output.resolve()
    charts = output / "charts"
    charts.mkdir(parents=True, exist_ok=True)

    bootstrap = subprocess.run(
        [args.node, str(ROOT / "scripts" / "build-expedition-difficulty-runtime.mjs")],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if bootstrap.returncode:
        print(bootstrap.stderr or bootstrap.stdout, file=sys.stderr)
        return bootstrap.returncode

    configurations = [
        (difficulty_index, difficulty, ascension, players)
        for difficulty_index, difficulty in enumerate(difficulties)
        for ascension in ascensions
        for players in players_list
    ]
    if args.games is None:
        per_config = args.seeds if args.seeds is not None else 1
        game_counts = [per_config] * len(configurations)
    else:
        base, remainder = divmod(args.games, len(configurations))
        game_counts = [
            base + (1 if index < remainder else 0)
            for index in range(len(configurations))
        ]
    maximum_runs = max(game_counts, default=0)
    if args.seed_mode == "fixed":
        seed_pool = list(range(args.start_seed, args.start_seed + maximum_runs))
    else:
        randomizer = random.SystemRandom()
        seed_pool = [randomizer.getrandbits(53) for _ in range(maximum_runs)]

    tasks: list[dict[str, Any]] = []
    for (
        difficulty_index,
        difficulty,
        ascension,
        players,
    ), seed_count in zip(configurations, game_counts):
        if seed_count < 1:
            continue
        tasks.append(
            {
                "difficulty": difficulty,
                "modeIndex": difficulty_index,
                "ascension": ascension,
                "players": players,
                "style": args.style,
                "seeds": seed_pool[:seed_count],
                "maxSteps": args.max_steps,
            }
        )

    runs: list[dict[str, Any]] = []
    started = datetime.now(timezone.utc)
    completed_tasks = 0
    print(
        f"扫描 {len(tasks)} 个配置，共 {sum(game_counts)} 轮，"
        f"种子={'固定' if args.seed_mode == 'fixed' else '随机'}，"
        f"线程数 {args.workers}。",
        flush=True,
    )
    with concurrent.futures.ThreadPoolExecutor(
        max_workers=args.workers
    ) as executor:
        future_map = {
            executor.submit(run_worker, args.node, task): task for task in tasks
        }
        for future in concurrent.futures.as_completed(future_map):
            task, task_runs = future.result()
            runs.extend(task_runs)
            completed_tasks += 1
            wins = sum(1 for run in task_runs if run["won"])
            print(
                f"[{completed_tasks}/{len(tasks)}] "
                f"{DIFFICULTY_NAMES[task['difficulty']]} "
                f"N{task['ascension']} {task['players']}p: "
                f"{wins}/{len(task_runs)} 胜利",
                flush=True,
            )

    runs.sort(
        key=lambda run: (
            run["difficulty"],
            run["ascension"],
            run["players"],
            run["seed"],
        )
    )
    summaries = summarize(runs, difficulties, ascensions, players_list)
    primary_players = players_list[0]
    svg_payloads = {
        "win-rate.svg": line_chart(
            summaries,
            difficulties,
            ascensions,
            players_list,
            lambda item: item["winRate"] * 100,
            "N0-N10 胜率",
            suffix="%",
            maximum=100,
            minimum=0,
        ),
        "progress.svg": line_chart(
            summaries,
            difficulties,
            ascensions,
            players_list,
            lambda item: item["progress"],
            "N0-N10 平均推进深度",
            minimum=0,
        ),
        "utility.svg": line_chart(
            summaries,
            difficulties,
            ascensions,
            players_list,
            lambda item: item["utility"],
            "N0-N10 综合效用",
        ),
        "risk.svg": line_chart(
            summaries,
            difficulties,
            ascensions,
            players_list,
            lambda item: item["risk"],
            "N0-N10 风险",
            maximum=100,
            minimum=0,
        ),
        "win-rate-matrix.svg": matrix_chart(
            summaries,
            difficulties,
            ascensions,
            primary_players,
            lambda item: item["winRate"],
            lambda value: f"{round(value * 100)}%",
            "N0-N10 胜率热力图",
        ),
        "risk-matrix.svg": matrix_chart(
            summaries,
            difficulties,
            ascensions,
            primary_players,
            lambda item: item["risk"],
            lambda value: f"{value:.0f}",
            "N0-N10 风险热力图",
        ),
    }
    for name, payload in svg_payloads.items():
        (charts / name).write_text(payload, encoding="utf-8")

    report = build_report(
        summaries,
        runs,
        difficulties,
        ascensions,
        players_list,
        args.style,
        args.seed_mode,
        seed_pool,
        args.start_seed,
    )
    (output / "report.md").write_text(report, encoding="utf-8")
    (output / "results.json").write_text(
        json.dumps(
            {
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "configuration": {
                    "style": args.style,
                    "difficulties": difficulties,
                    "ascensions": ascensions,
                    "players": players_list,
                    "seedMode": args.seed_mode,
                    "seedPool": seed_pool,
                    "games": sum(game_counts),
                    "startSeed": args.start_seed,
                    "maxSteps": args.max_steps,
                    "workers": args.workers,
                },
                "summaries": summaries,
                "runs": runs,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    print(f"完成：{len(runs)} 轮，用时 {elapsed:.1f} 秒", flush=True)
    print(output / "report.md", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
