/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { expect } from "chai";
import { Checker } from "../Checker";
import { Point3d, Vector3d } from "../../geometry3d/Point3dVector3d";
import { LineSegment3d } from "../../curve/LineSegment3d";
import { Arc3d } from "../../curve/Arc3d";
import { GeometryQuery } from "../../curve/GeometryQuery";

import { ClipPlane } from "../../clipping/ClipPlane";

import { GeometryCoreTestIO } from "../GeometryCoreTestIO";
import { Loop } from "../../curve/Loop";
import { BooleanClipNode } from "../../clipping/BooleanClipNode";
import { BooleanClipFactory } from "../../clipping/BooleanClipFactory";
import { Clipper, ClipUtilities } from "../../clipping/ClipUtils";
import { Geometry } from "../../Geometry";
import { AngleSweep } from "../../geometry3d/AngleSweep";
import { ConvexClipPlaneSet } from "../../clipping/ConvexClipPlaneSet";
import { LineString3d } from "../../curve/LineString3d";
import { Sample } from "../../serialization/GeometrySamples";
import { CurvePrimitive } from "../../curve/CurvePrimitive";
/* tslint:disable:no-console variable-name */
/**
 *
 * @param origin
 * @param vectorA
 * @param vectorB
 */
function makePanel(origin: Point3d, vectorA: Vector3d, a0: number, a1: number, vectorB: Vector3d, b0: number, b1: number): GeometryQuery {
  const point00 = origin.plus2Scaled(vectorA, a0, vectorB, b0);
  const point10 = origin.plus2Scaled(vectorA, a1, vectorB, b0);
  const point01 = origin.plus2Scaled(vectorA, a0, vectorB, b1);
  const point11 = origin.plus2Scaled(vectorA, a1, vectorB, b1);
  return Loop.createPolygon([point00, point10, point11, point01, point00]);
}

describe("ClipNodes", () => {

  it("ClipManyBooleans", () => {
    const ck = new Checker();
    const allGeometry: GeometryQuery[] = [];
    const sharedOrigin = Point3d.create(0.5, 0.75, 0.0);
    const clipY = ClipPlane.createNormalAndPoint(Vector3d.create(0, 1, 0), sharedOrigin)!;
    const clipX = ClipPlane.createNormalAndPoint(Vector3d.create(1, 0, 0), sharedOrigin)!;
    const clipperAOrB = BooleanClipFactory.createCaptureUnion([clipX, clipY], true);
    const clipperAAndB = BooleanClipFactory.createCaptureIntersection([clipY, clipX], true);
    const clipperAMinusB = BooleanClipFactory.createCaptureDifference(clipX, clipY, false);
    const clipperXOR = BooleanClipFactory.createCaptureParity([clipX, clipY], true);
    const clipperNXOR = BooleanClipFactory.createCaptureParity([clipX, clipY], false);
    const allClippers: Clipper[] = [clipperAAndB, clipX, clipY, clipperAOrB, clipperAAndB, clipperAMinusB, clipperXOR, clipperNXOR];
    const clipperName = new Map<Clipper, string>();
    clipperName.set(clipY, "ClipY");
    clipperName.set(clipX, "ClipX");
    clipperName.set(clipperAOrB, "clipperAOrB");
    clipperName.set(clipperAAndB, "clipperAAndB");
    clipperName.set(clipperAMinusB, "clipperAMinusB");
    clipperName.set(clipperXOR, "clipperXOR");
    clipperName.set(clipperXOR, "NXOR");
    const x0 = 0;
    const y0 = 0;
    let z0 = 0;
    const points = [Point3d.create(-1, -1, 0), Point3d.create(2, -1, 0), Point3d.create(2, 2, 0), Point3d.create(-1, 2, 0), Point3d.create(-1, -1, 0)];
    const segments = [];
    for (let i = 0; i + 1 < points.length; i++) {
      const segment = LineSegment3d.create(points[i], points[i + 1]);
      GeometryCoreTestIO.captureCloneGeometry(allGeometry, segment, x0, y0, z0);
      segments.push(segment);
    }
    for (const clipper of allClippers) {
      const clipper1 = clipper as any;
      if (clipper1.toJSON) {
        const jsonA = clipper1.toJSON();
        const clipper2 = BooleanClipFactory.parseToClipper(jsonA);
        ck.testTrue(ClipUtilities.isClipper(clipper2), clipper2);
      } else {
        ck.announceError(" Clipper does not have toJSON" + clipperName.get(clipper));
      }
    }
    const arcs = [];
    let radius = 0.3;
    const radiusStep = 0.04;
    const gapDegrees = 10.0;
    for (const sweepDegrees of [40, 65, 170, 360]) {
      for (let startDegrees = 35.0; startDegrees + sweepDegrees < 390; startDegrees += sweepDegrees + gapDegrees) {
        radius += radiusStep;
        const arc = Arc3d.createXY(sharedOrigin, radius, AngleSweep.createStartSweepDegrees(startDegrees, sweepDegrees));
        arcs.push(arc);
        GeometryCoreTestIO.captureCloneGeometry(allGeometry, arc, x0, y0, z0);
        const arc1 = Arc3d.createXY(sharedOrigin, radius + radiusStep * 0.25, AngleSweep.createStartSweepDegrees(startDegrees + sweepDegrees, -sweepDegrees));
        arcs.push(arc1);
        GeometryCoreTestIO.captureCloneGeometry(allGeometry, arc1, x0, y0, z0);
        const arc2 = Arc3d.createXY(sharedOrigin, radius + radiusStep * 0.5, AngleSweep.createStartSweepDegrees(startDegrees + sweepDegrees - 360, -sweepDegrees));
        arcs.push(arc2);
        GeometryCoreTestIO.captureCloneGeometry(allGeometry, arc2, x0, y0, z0);
        const arc3 = Arc3d.createXY(sharedOrigin, radius + radiusStep * 0.75, AngleSweep.createStartSweepDegrees(startDegrees - 360, sweepDegrees));
        arcs.push(arc3);
        GeometryCoreTestIO.captureCloneGeometry(allGeometry, arc3, x0, y0, z0);
      }
    }
    const vectorX = Vector3d.unitX(1);
    const vectorY = Vector3d.unitY(1);
    const vectorZ = Vector3d.unitZ(0.2);

    const wallX = makePanel(sharedOrigin, vectorY, -2, 5, vectorZ, -1, 1);
    const wallY = makePanel(sharedOrigin, vectorX, -2, 8, vectorZ, -1, 1);
    GeometryCoreTestIO.captureCloneGeometry(allGeometry, wallX, x0, y0, z0);
    GeometryCoreTestIO.captureCloneGeometry(allGeometry, wallY, x0, y0, z0);

    for (const clipper of allClippers) {
      if (clipper instanceof BooleanClipNode) {
        const clipper1 = BooleanClipFactory.createCaptureClipOutside(clipper);
        for (const p of points) {
          const q = clipper.isPointOnOrInside(p);
          const q1 = clipper1.isPointOnOrInside(p);
          ck.testBoolean(q, !q1, "clip versus clip outside");
          clipper.toggleResult();
          const r = clipper.isPointOnOrInside(p);
          ck.testBoolean(q, !r, "toggled test" + clipperName.get(clipper), p, q, r);
          clipper.toggleResult();
        }
      }
    }

    for (const clipper of allClippers) {
      z0 += 4;
      GeometryCoreTestIO.captureCloneGeometry(allGeometry, wallX, x0, y0, z0);
      GeometryCoreTestIO.captureCloneGeometry(allGeometry, wallY, x0, y0, z0);

      for (const segment of segments) {
        clipper.announceClippedSegmentIntervals(0, 1, segment.startPoint(), segment.endPoint(),
          (a0: number, a1: number) => {
            const midPoint = segment.fractionToPoint(Geometry.interpolate(a0, 0.5, a1));
            if (!ck.testTrue(clipper.isPointOnOrInside(midPoint), "clipped midpoint", midPoint, clipperName.get(clipper)))
              clipper.isPointOnOrInside(midPoint);
            if (clipper instanceof BooleanClipNode) {
              clipper.toggleResult();
              if (!ck.testFalse(clipper.isPointOnOrInside(midPoint), "clipped midpoint", midPoint, clipperName.get(clipper)))
                clipper.isPointOnOrInside(midPoint);
              clipper.toggleResult();
            }
            GeometryCoreTestIO.captureGeometry(allGeometry, segment.clonePartialCurve(a0, a1), x0, y0, z0);
          });
      }
      for (const arc of arcs) {
        clipper.announceClippedArcIntervals(arc,
          (a0: number, a1: number) => {
            const midPoint = arc.fractionToPoint(Geometry.interpolate(a0, 0.5, a1));
            if (!ck.testTrue(clipper.isPointOnOrInside(midPoint), "clipped midpoint", midPoint, clipperName.get(clipper)))
              clipper.isPointOnOrInside(midPoint);
            GeometryCoreTestIO.captureGeometry(allGeometry, arc.clonePartialCurve(a0, a1), x0, y0, z0);
          });
      }

    }
    GeometryCoreTestIO.saveGeometry(allGeometry, "ClipNode", "ClipManyBooleans");
    expect(ck.getNumErrors()).equals(0);
  });
  it("ClipManyBoxes", () => {
    const ck = new Checker();
    const allGeometry: GeometryQuery[] = [];
    const x0 = 0.0;
    const y0 = 0.0;
    let yOut = 10.0;
    const captureClip = (a0: number, a1: number, cp: CurvePrimitive) => {
      GeometryCoreTestIO.captureGeometry(allGeometry, cp.clonePartialCurve(a0, a1), x0, yOut);
    };
    const unitBoxPoints = [Point3d.create(0, 0, 0), Point3d.create(1, 0, 0), Point3d.create(1, 1, 0), Point3d.create(0, 1, 0), Point3d.create(0, 0, 0)];
    const clipperA = createTranslatedClipperUnion(allGeometry, 8, unitBoxPoints, Point3d.create(0, 0, 0), Point3d.create(20, 8, 0), 1.0, 7.0, x0, y0);
    const ls = LineString3d.create(Sample.createBidirectionalSawtooth(Point3d.create(-1, 0.5, 0), 3, 2, 5, 3, 3, 7, 1, 2, -1, 2));
    ls.announceClipIntervals(clipperA, captureClip);
    (clipperA as BooleanClipNode).toggleResult();
    yOut = 20;
    ls.announceClipIntervals(clipperA, captureClip);
    (clipperA as BooleanClipNode).toggleResult();
    GeometryCoreTestIO.captureCloneGeometry(allGeometry, ls, x0, y0);
    GeometryCoreTestIO.saveGeometry(allGeometry, "ClipNode", "ClipManyBoxes");
    expect(ck.getNumErrors()).equals(0);
  });

});

function createTranslatedClipper(origin: Point3d, polygonPoints: Point3d[], scale: number): { clipper: Clipper, points: Point3d[] } {
  const myPoints: Point3d[] = [];
  for (const p of polygonPoints)
    myPoints.push(Point3d.createAdd2Scaled(origin, 1, p, scale));
  const convexClip = ConvexClipPlaneSet.createSweptPolyline(myPoints, Vector3d.unitZ())!;
  return { clipper: convexClip, points: myPoints };
}

function createTranslatedClipperUnion(allGeometry: GeometryQuery[], count: number, points: Point3d[], origin0: Point3d, origin1: Point3d, scale0: number, scale1: number, x0: number, y0: number): Clipper {
  const clippers = [];
  for (let i = 0; i < count; i++) {
    const f = i / (count - 1);
    const origin = origin0.interpolate(f, origin1);
    const scale = Geometry.interpolate(scale0, f, scale1);
    const data = createTranslatedClipper(origin, points, scale);
    clippers.push(data.clipper);
    GeometryCoreTestIO.captureGeometry(allGeometry, LineString3d.create(data.points), x0, y0);
  }
  return BooleanClipFactory.createCaptureUnion(clippers, true);
}
