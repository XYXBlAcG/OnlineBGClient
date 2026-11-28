import { Color, Float32BufferAttribute, MathUtils, PlaneGeometry } from "three";
import { sampleGolfSurface } from "../../../domain/golf/terrain";
import type { GolfCourse, GolfPoint } from "../../../domain/golf/types";

const border = 9;
function segmentDistance(x: number, y: number, from: GolfPoint, to: GolfPoint) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const t = MathUtils.clamp(((x - from.x) * dx + (y - from.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(x - from.x - dx * t, y - from.y - dy * t);
}

export function golfSurfaceGeometry(course: GolfCourse, accent: string) {
  const width = course.width + border * 2;
  const height = course.height + border * 2;
  const geometry = new PlaneGeometry(width, height, Math.ceil(width * 4), Math.ceil(height * 4));
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position!;
  const colors = new Float32Array(positions.count * 3);
  const grass = new Color("#ffffff");
  const edge = new Color(accent);
  const fairway = new Color("#e3ffbf");
  const tee = new Color("#efe6c4");
  const shade = new Color();
  const lanes = [course.line, ...(course.branches ?? [])];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + course.width / 2;
    const y = positions.getZ(i) + course.height / 2;
    const outside = Math.max(0, -x, -y, x - course.width, y - course.height);
    const at = { x: MathUtils.clamp(x, 0, course.width), y: MathUtils.clamp(y, 0, course.height) };
    const surface = sampleGolfSurface(course, at);
    const level = surface.height;
    const steepness = Math.hypot(surface.dx, surface.dy);
    positions.setY(i, MathUtils.lerp(level, -0.055, MathUtils.smoothstep(outside, 0, 2)));
    shade.copy(grass);
    if (outside === 0) {
      let distance = Infinity;
      for (const lane of lanes) {
        let from = course.tee;
        for (const to of lane) {
          distance = Math.min(distance, segmentDistance(x, y, from, to));
          from = to;
        }
      }
      const flat = 1 - MathUtils.smoothstep(steepness, 0.32, 0.7);
      shade.lerp(edge, (1 - MathUtils.smoothstep(distance, 1.05, 1.38)) * flat);
      shade.lerp(fairway, (1 - MathUtils.smoothstep(distance, 0.65, 1.01)) * flat);
      shade.lerp(fairway, (1 - MathUtils.smoothstep(Math.hypot(x - course.cup.x, y - course.cup.y), 0.78, 1)) * flat);
      shade.lerp(tee, (1 - MathUtils.smoothstep(Math.hypot(x - course.tee.x, y - course.tee.y), 0.26, 0.48)) * flat);

    }
    shade.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
