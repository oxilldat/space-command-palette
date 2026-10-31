import assert from "node:assert/strict";
import test from "node:test";
import { annularSectorPolygon, radialSlotCount, sectorPolygon } from "./geometry";

test("sector polygon creates a clipped donut wedge", () => {
  const polygon = sectorPolygon(0, 4, 120, 38);
  assert.match(polygon, /^polygon\(/);
  assert.ok(polygon.split(",").length >= 8);
  assert.equal(polygon.includes("NaN"), false);
});

test("a sparse menu always keeps four radial slots", () => {
  assert.equal(radialSlotCount(1), 4);
  assert.equal(radialSlotCount(3), 4);
  assert.equal(radialSlotCount(6), 6);
});

test("submenu fan accepts an arbitrary angular range", () => {
  const polygon = annularSectorPolygon(-0.8, -0.2, 170, 120);
  assert.match(polygon, /^polygon\(/);
  assert.equal(polygon.includes("NaN"), false);
});

