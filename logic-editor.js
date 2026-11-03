(function (root) {
    'use strict';
    const L = typeof module !== 'undefined' && module.exports
        ? require('./logic-model.js')
        : (root.LogicLab || (root.LogicLab = {}));

    function simplifyPath(points) {
        if (!points.length) return [];
        const dedup = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const prev = dedup[dedup.length - 1];
            const cur = points[i];
            if (Math.hypot(cur.x - prev.x, cur.y - prev.y) > 1e-6) {
                dedup.push(cur);
            }
        }
        if (dedup.length <= 2) return dedup;
        const out = [dedup[0]];
        for (let i = 1; i < dedup.length - 1; i++) {
            const a = out[out.length - 1];
            const b = dedup[i];
            const c = dedup[i + 1];
            const collinearX = Math.abs(a.x - b.x) < 1e-6 && Math.abs(b.x - c.x) < 1e-6;
            const collinearY = Math.abs(a.y - b.y) < 1e-6 && Math.abs(b.y - c.y) < 1e-6;
            if (!collinearX && !collinearY) {
                out.push(b);
            }
        }
        out.push(dedup[dedup.length - 1]);
        return out;
    }

    function orthogonalPath(anchors, verticalFirst = false) {
        if (!anchors.length) return [];
        const path = [{ x: anchors[0].x, y: anchors[0].y }];
        let vf = verticalFirst;
        for (let i = 1; i < anchors.length; i++) {
            const a = path[path.length - 1];
            const b = anchors[i];
            if (Math.abs(a.x - b.x) > 1e-6 && Math.abs(a.y - b.y) > 1e-6) {
                path.push(vf ? { x: a.x, y: b.y } : { x: b.x, y: a.y });
            }
            if (Math.hypot(path[path.length - 1].x - b.x, path[path.length - 1].y - b.y) > 1e-6) {
                path.push({ x: b.x, y: b.y });
            }
            if (path.length > 1) {
                const p1 = path[path.length - 1];
                const p0 = path[path.length - 2];
                vf = Math.abs(p1.x - p0.x) < 1e-6;
            }
        }
        return simplifyPath(path);
    }

    function pinStub(pin, stubLen = 14) {
        const dx = pin.dir?.dx ?? (pin.role === 'out' ? 1 : -1);
        const dy = pin.dir?.dy ?? 0;
        return {
            x: pin.x + dx * stubLen,
            y: pin.y + dy * stubLen
        };
    }

    function collectBoxes(doc, ignoreIds = new Set()) {
        const boxes = [];
        for (const n of doc.inputs) if (!ignoreIds.has(n.id)) boxes.push(L.nodeBounds(n, 'input'));
        for (const n of doc.consts) if (!ignoreIds.has(n.id)) boxes.push(L.nodeBounds(n, 'const'));
        for (const n of doc.gates) if (!ignoreIds.has(n.id)) boxes.push(L.nodeBounds(n, 'gate'));
        for (const n of doc.outputs) if (!ignoreIds.has(n.id)) boxes.push(L.nodeBounds(n, 'output'));
        return boxes;
    }

    function segmentHitsBoxes(p, q, boxes) {
        let hits = 0;
        if (Math.abs(p.x - q.x) < 1e-6) {
            const minY = Math.min(p.y, q.y);
            const maxY = Math.max(p.y, q.y);
            for (const box of boxes) {
                if (p.x > box.left && p.x < box.right && maxY > box.top && minY < box.bottom) {
                    hits++;
                }
            }
        } else if (Math.abs(p.y - q.y) < 1e-6) {
            const minX = Math.min(p.x, q.x);
            const maxX = Math.max(p.x, q.x);
            for (const box of boxes) {
                if (p.y > box.top && p.y < box.bottom && maxX > box.left && minX < box.right) {
                    hits++;
                }
            }
        }
        return hits;
    }

    function routeBetweenPins(doc, startPin, endPin, laneShift = 0) {
        const a = pinStub(startPin, 14);
        const b = pinStub(endPin, 14);
        const midX = (a.x + b.x) / 2 + laneShift;
        const midY = (a.y + b.y) / 2;

        const ignore = new Set([startPin.nodeId, endPin.nodeId].filter(Boolean));
        const obstacleBoxes = collectBoxes(doc, ignore);
        const selfBoxes = [];
        if (startPin.nodeId) {
            const f = L.findNode(doc, startPin.nodeId);
            if (f) selfBoxes.push(L.nodeBounds(f.node, f.kind));
        }
        if (endPin.nodeId && endPin.nodeId !== startPin.nodeId) {
            const f = L.findNode(doc, endPin.nodeId);
            if (f) selfBoxes.push(L.nodeBounds(f.node, f.kind));
        }

        const primaryZ = orthogonalPath([a, { x: midX, y: a.y }, { x: midX, y: b.y }, b]);
        const candidates = [
            primaryZ,
            orthogonalPath([a, b], false),
            orthogonalPath([a, b], true),
            orthogonalPath([a, { x: a.x, y: midY }, { x: b.x, y: midY }, b])
        ];

        function countHits(full) {
            let hits = 0;
            for (let i = 1; i < full.length; i++) {
                if (i === 1 || i === full.length - 1) continue;
                const p = full[i - 1];
                const q = full[i];
                hits += segmentHitsBoxes(p, q, obstacleBoxes);
                hits += segmentHitsBoxes(p, q, selfBoxes);
            }
            return hits;
        }

        // Fast & rock-solid path: if standard Z-route is forward and obstacle-free, use it directly
        const fullPrimary = simplifyPath([{ x: startPin.x, y: startPin.y }, ...primaryZ, { x: endPin.x, y: endPin.y }]);
        if (b.x >= a.x - 4 && countHits(fullPrimary) === 0) {
            return fullPrimary;
        }

        const allBoxes = [...obstacleBoxes, ...selfBoxes];
        for (const box of allBoxes) {
            for (const x of [box.left - 18, box.right + 18]) {
                candidates.push(orthogonalPath([a, { x, y: a.y }, { x, y: b.y }, b]));
            }
            for (const y of [box.top - 18, box.bottom + 18]) {
                candidates.push(orthogonalPath([a, { x: a.x, y }, { x: b.x, y }, b]));
            }
        }

        function scorePath(innerPath, idx) {
            const full = simplifyPath([{ x: startPin.x, y: startPin.y }, ...innerPath, { x: endPin.x, y: endPin.y }]);
            let length = 0;
            for (let i = 1; i < full.length; i++) {
                length += Math.hypot(full[i].x - full[i - 1].x, full[i].y - full[i - 1].y);
            }
            const hits = countHits(full);
            const bends = Math.max(0, full.length - 2);
            return hits * 1e8 + length + bends * 16 + idx * 0.5;
        }

        let best = candidates[0];
        let bestScore = scorePath(best, 0);
        for (let i = 1; i < candidates.length; i++) {
            const s = scorePath(candidates[i], i);
            if (s < bestScore) {
                bestScore = s;
                best = candidates[i];
            }
        }

        return simplifyPath([{ x: startPin.x, y: startPin.y }, ...best, { x: endPin.x, y: endPin.y }]);
    }

    function wireRoute(doc, wire, pins = L.allPins(doc), laneShift = 0) {
        const startPin = pins.get(L.pinKey(wire.from?.nodeId, wire.from?.pin));
        const endPin = pins.get(L.pinKey(wire.to?.nodeId, wire.to?.pin));
        if (!startPin || !endPin) return [];
        if (wire.waypoints && wire.waypoints.length) {
            return orthogonalPath([
                { x: startPin.x, y: startPin.y },
                pinStub(startPin, 12),
                ...wire.waypoints,
                pinStub(endPin, 12),
                { x: endPin.x, y: endPin.y }
            ]);
        }
        return routeBetweenPins(doc, startPin, endPin, laneShift);
    }

    function extractSegments(path, wireId = null, sourceKey = null) {
        const segs = [];
        if (!path || path.length < 2) return segs;
        for (let i = 1; i < path.length; i++) {
            const a = path[i - 1];
            const b = path[i];
            const isVertical = Math.abs(a.x - b.x) < 1e-4 && Math.abs(a.y - b.y) > 1e-4;
            const isHorizontal = Math.abs(a.y - b.y) < 1e-4 && Math.abs(a.x - b.x) > 1e-4;
            segs.push({
                wireId,
                sourceKey,
                segIndex: i - 1,
                a,
                b,
                isVertical,
                isHorizontal
            });
        }
        return segs;
    }

    function verticalSegmentsOverlap(vSegA, vSegB) {
        if (Math.abs(vSegA.a.x - vSegB.a.x) > 4) return false;
        const minAY = Math.min(vSegA.a.y, vSegA.b.y);
        const maxAY = Math.max(vSegA.a.y, vSegA.b.y);
        const minBY = Math.min(vSegB.a.y, vSegB.b.y);
        const maxBY = Math.max(vSegB.a.y, vSegB.b.y);
        return Math.min(maxAY, maxBY) - Math.max(minAY, minBY) > 2;
    }

    function computeAllWireGeometry(doc, pins = L.allPins(doc)) {
        const routes = new Map();
        const placedVerticalSegs = [];

        for (const w of doc.wires) {
            const sourceKey = L.pinKey(w.from?.nodeId, w.from?.pin);
            let path = wireRoute(doc, w, pins, 0);

            // If auto-routed, check if any interior vertical segment overlaps an unrelated wire's vertical lane
            if (!w.waypoints || !w.waypoints.length) {
                const candidateOffsets = [0, 12, -12, 24, -24, 36, -36];
                for (const offset of candidateOffsets) {
                    const tryPath = offset === 0 ? path : wireRoute(doc, w, pins, offset);
                    const vSegs = extractSegments(tryPath, w.id, sourceKey).filter(s => s.isVertical);
                    const hasConflict = vSegs.some(myV =>
                        placedVerticalSegs.some(otherV =>
                            otherV.sourceKey !== sourceKey && verticalSegmentsOverlap(myV, otherV)
                        )
                    );
                    if (!hasConflict) {
                        path = tryPath;
                        break;
                    }
                }
            }

            routes.set(w.id, path);
            for (const s of extractSegments(path, w.id, sourceKey)) {
                if (s.isVertical) placedVerticalSegs.push(s);
            }
        }

        // Collect all segments across all wires to find orthogonal crossings and same-net branch junctions
        const allHoriz = [];
        const allVert = [];
        for (const w of doc.wires) {
            const sourceKey = L.pinKey(w.from?.nodeId, w.from?.pin);
            const path = routes.get(w.id) || [];
            for (const s of extractSegments(path, w.id, sourceKey)) {
                if (s.isHorizontal) allHoriz.push(s);
                else if (s.isVertical) allVert.push(s);
            }
        }

        const crossingsByWire = new Map();
        for (const h of allHoriz) {
            const minX = Math.min(h.a.x, h.b.x);
            const maxX = Math.max(h.a.x, h.b.x);
            const y = h.a.y;
            for (const v of allVert) {
                if (h.wireId === v.wireId) continue;
                // Only hop when crossing a DIFFERENT signal net; same-net intersections are T-junctions
                if (h.sourceKey && h.sourceKey === v.sourceKey) continue;
                const x = v.a.x;
                const minY = Math.min(v.a.y, v.b.y);
                const maxY = Math.max(v.a.y, v.b.y);
                if (x > minX + 7 && x < maxX - 7 && y > minY + 3 && y < maxY - 3) {
                    if (!crossingsByWire.has(h.wireId)) crossingsByWire.set(h.wireId, []);
                    crossingsByWire.get(h.wireId).push({ x, y, segIndex: h.segIndex });
                }
            }
        }

        // Find T-junction solder dots where wires sharing the same source pin split apart
        const junctions = [];
        const seenJunctions = new Set();
        const wiresBySource = new Map();
        for (const w of doc.wires) {
            const sk = L.pinKey(w.from?.nodeId, w.from?.pin);
            if (!wiresBySource.has(sk)) wiresBySource.set(sk, []);
            wiresBySource.get(sk).push(w);
        }
        for (const [sourceKey, group] of wiresBySource.entries()) {
            if (group.length < 2) continue;
            for (let i = 0; i < group.length; i++) {
                const pathA = routes.get(group[i].id) || [];
                const segsA = extractSegments(pathA, group[i].id, sourceKey);
                for (let j = 0; j < group.length; j++) {
                    if (i === j) continue;
                    const pathB = routes.get(group[j].id) || [];
                    // Check interior bend points of pathB lying on a segment of pathA
                    for (let k = 1; k < pathB.length - 1; k++) {
                        const pt = pathB[k];
                        for (const sA of segsA) {
                            if (distanceToSegment(pt, sA.a, sA.b) < 1.5) {
                                // Check if paths diverge at pt
                                const key = `${Math.round(pt.x)},${Math.round(pt.y)}:${sourceKey}`;
                                if (!seenJunctions.has(key)) {
                                    seenJunctions.add(key);
                                    junctions.push({
                                        x: pt.x,
                                        y: pt.y,
                                        nodeId: group[i].from.nodeId,
                                        sourceKey
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        return {
            routes,
            crossingsByWire,
            verticalSegments: allVert,
            junctions
        };
    }

    function previewWireRoute(doc, startPin, cursorOrEndPin) {
        if (!startPin || !cursorOrEndPin) return [];
        if (cursorOrEndPin.role && cursorOrEndPin.role !== startPin.role) {
            const fromPin = startPin.role === 'out' ? startPin : cursorOrEndPin;
            const toPin = startPin.role === 'in' ? startPin : cursorOrEndPin;
            return routeBetweenPins(doc, fromPin, toPin);
        }
        const a = pinStub(startPin, 16);
        return orthogonalPath([
            { x: startPin.x, y: startPin.y },
            a,
            { x: cursorOrEndPin.x, y: cursorOrEndPin.y }
        ]);
    }

    function distanceToSegment(p, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        const t = lenSq ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq)) : 0;
        const projX = a.x + t * dx;
        const projY = a.y + t * dy;
        return Math.hypot(p.x - projX, p.y - projY);
    }

    function findSnapPin(doc, worldPoint, radius = 16, requiredRole = null, pins = L.allPins(doc)) {
        let best = null;
        let bestDist = radius;
        for (const pin of pins.values()) {
            if (requiredRole && pin.role !== requiredRole) continue;
            const d = Math.hypot(worldPoint.x - pin.x, worldPoint.y - pin.y);
            if (d <= bestDist) {
                bestDist = d;
                best = pin;
            }
        }
        return best;
    }

    function hitNodeBody(doc, worldPoint, pad = 2) {
        for (const inp of doc.inputs.slice().reverse()) {
            const b = L.nodeBounds(inp, 'input');
            if (worldPoint.x >= b.left - pad && worldPoint.x <= b.right + pad && worldPoint.y >= b.top - pad && worldPoint.y <= b.bottom + pad) {
                const onToggle = worldPoint.x >= inp.position.x - 4 && worldPoint.x <= inp.position.x + 22 && Math.abs(worldPoint.y - inp.position.y) <= 14;
                return { kind: 'input', id: inp.id, node: inp, onToggle };
            }
        }

        for (const c of doc.consts.slice().reverse()) {
            const b = L.nodeBounds(c, 'const');
            if (worldPoint.x >= b.left - pad && worldPoint.x <= b.right + pad && worldPoint.y >= b.top - pad && worldPoint.y <= b.bottom + pad) {
                return { kind: 'const', id: c.id, node: c, onToggle: true };
            }
        }

        for (const out of doc.outputs.slice().reverse()) {
            const b = L.nodeBounds(out, 'output');
            if (worldPoint.x >= b.left - pad && worldPoint.x <= b.right + pad && worldPoint.y >= b.top - pad && worldPoint.y <= b.bottom + pad) {
                return { kind: 'output', id: out.id, node: out };
            }
        }

        for (const g of doc.gates.slice().reverse()) {
            const b = L.nodeBounds(g, 'gate');
            if (worldPoint.x >= b.left - pad && worldPoint.x <= b.right + pad && worldPoint.y >= b.top - pad && worldPoint.y <= b.bottom + pad) {
                return { kind: 'gate', id: g.id, node: g };
            }
        }
        return null;
    }

    function hitTest(doc, worldPoint, { touch = false, zoom = 1, preferNode = false, pins = L.allPins(doc), routes = null } = {}) {
        const bodyPad = (touch ? 6 : 2) / zoom;

        if (preferNode) {
            const nodeHit = hitNodeBody(doc, worldPoint, bodyPad);
            if (nodeHit) return nodeHit;

            const pinRadius = (touch ? 18 : 11) / zoom;
            const hitPin = findSnapPin(doc, worldPoint, pinRadius, null, pins);
            if (hitPin) {
                return { kind: 'pin', pin: hitPin, id: hitPin.key, nodeId: hitPin.nodeId };
            }
        } else {
            const pinRadius = (touch ? 22 : 13) / zoom;
            const hitPin = findSnapPin(doc, worldPoint, pinRadius, null, pins);
            if (hitPin) {
                return { kind: 'pin', pin: hitPin, id: hitPin.key, nodeId: hitPin.nodeId };
            }

            const nodeHit = hitNodeBody(doc, worldPoint, bodyPad);
            if (nodeHit) return nodeHit;
        }

        // Check wires
        const wireTol = (touch ? 14 : 8) / zoom;
        for (const w of doc.wires.slice().reverse()) {
            const path = routes?.get(w.id) || wireRoute(doc, w, pins);
            for (let i = 1; i < path.length; i++) {
                const d = distanceToSegment(worldPoint, path[i - 1], path[i]);
                if (d <= wireTol) {
                    return { kind: 'wire', id: w.id, wire: w, segmentIndex: i - 1, path };
                }
            }
        }

        return null;
    }

    Object.assign(L, {
        simplifyPath,
        orthogonalPath,
        pinStub,
        routeBetweenPins,
        wireRoute,
        computeAllWireGeometry,
        previewWireRoute,
        distanceToSegment,
        findSnapPin,
        hitTest
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = L;
    }
})(typeof window !== 'undefined' ? window : globalThis);
