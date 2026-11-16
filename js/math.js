export function catmullRomPoint(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
  };
}

export class TrackSegment {
  constructor(id, name, fromNode, toNode, controlPoints, maxSpeed = 140) {
    this.id = id;
    this.name = name;
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.maxSpeed = maxSpeed;
    this.samples = [];
    this.length = 0;
    this.occupiedBy = null;
    this.buildPolyline(controlPoints);
  }

  buildPolyline(pts) {
    const raw = [];
    const stepsPerSpan = 36;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < stepsPerSpan; s++) {
        raw.push(catmullRomPoint(p0, p1, p2, p3, s / stepsPerSpan));
      }
    }
    raw.push({ ...pts[pts.length - 1] });

    let dist = 0;
    for (let i = 0; i < raw.length; i++) {
      if (i > 0) {
        dist += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
      }
      const prev = raw[Math.max(0, i - 1)];
      const next = raw[Math.min(raw.length - 1, i + 1)];
      const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
      this.samples.push({ x: raw[i].x, y: raw[i].y, dist, angle });
    }
    this.length = dist;
  }

  getPointAt(d, dir = 1) {
    const actualDist = dir === 1 ? Math.max(0, Math.min(this.length, d)) : Math.max(0, Math.min(this.length, this.length - d));
    let lo = 0, hi = this.samples.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.samples[mid].dist <= actualDist) lo = mid;
      else hi = mid;
    }
    const s1 = this.samples[lo];
    const s2 = this.samples[hi];
    const span = s2.dist - s1.dist;
    const t = span > 0.0001 ? (actualDist - s1.dist) / span : 0;
    const x = s1.x + (s2.x - s1.x) * t;
    const y = s1.y + (s2.y - s1.y) * t;
    let angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
    if (span <= 0.0001) angle = s1.angle;
    if (dir === -1) angle += Math.PI;
    return { x, y, angle };
  }
}