/** Builds an annular-sector polygon in percentages for a square of `outerRadius * 2`. */
export function annularSectorPolygon(
  startAngle: number,
  endAngle: number,
  outerRadius: number,
  innerRadius: number,
  gapRadians = 0.025,
): string {
  const availableGap = Math.min(gapRadians, Math.max(0, (endAngle - startAngle) / 4));
  const start = startAngle + availableGap;
  const end = endAngle - availableGap;
  const steps = Math.max(3, Math.ceil((end - start) / (Math.PI / 18)));
  const points: string[] = [];
  const point = (angle: number, radius: number): string => {
    const x = 50 + Math.cos(angle) * radius / (outerRadius * 2) * 100;
    const y = 50 + Math.sin(angle) * radius / (outerRadius * 2) * 100;
    return `${x.toFixed(3)}% ${y.toFixed(3)}%`;
  };
  for (let step = 0; step <= steps; step += 1) {
    points.push(point(start + (end - start) * step / steps, outerRadius));
  }
  for (let step = steps; step >= 0; step -= 1) {
    points.push(point(start + (end - start) * step / steps, innerRadius));
  }
  return `polygon(${points.join(", ")})`;
}

/** Builds one sector of a complete radial ring. */
export function sectorPolygon(
  index: number,
  count: number,
  outerRadius: number,
  innerRadius: number,
  gapRadians = 0.025,
): string {
  const segment = (Math.PI * 2) / Math.max(1, count);
  return annularSectorPolygon(
    -Math.PI / 2 + index * segment,
    -Math.PI / 2 + (index + 1) * segment,
    outerRadius,
    innerRadius,
    gapRadians,
  );
}

/** Keeps sparse menus from stretching a single item across the whole circle. */
export function radialSlotCount(itemCount: number): number {
  return Math.max(4, Math.max(0, Math.floor(itemCount)));
}

