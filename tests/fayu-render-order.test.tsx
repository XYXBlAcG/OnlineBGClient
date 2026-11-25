import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FayuDrawing } from "../src/client/fayu/FayuDrawing";
import type { DrawStroke } from "../src/domain/drawguess/types";

it("keeps strokes painted after an eraser outside its mask", () => {
  const strokes: DrawStroke[] = [
    { id: "first", ink: "blue", color: "#001122", nextPart: 1, points: [[1, 2]], order: 1 },
    { id: "erase", ink: "erase", nextPart: 1, points: [[1, 2]], order: 2 },
    { id: "second", ink: "blue", color: "#112233", nextPart: 1, points: [[1, 2]], order: 3 },
  ];
  const html = renderToStaticMarkup(<FayuDrawing strokes={strokes} />);
  expect(html).toMatch(/mask="url\(#[^"]+\)"[^>]*>.*#001122[^>]*><\/circle><\/g><circle[^>]*#112233/);
});

it("renders a fast freehand stroke using the chosen width", () => {
  const html = renderToStaticMarkup(<FayuDrawing strokes={[{
    id: "fast", ink: "ink", nextPart: 1, width: 17, points: [[0, 0], [400, 20], [500, 30]],
  }]} />);
  expect(html).toContain('stroke-width="17"');
});
