import { WORLD_W, WORLD_H } from './constants.js';
import { TrackSegment } from './math.js';
import { TRACK_DATA } from './mapData.js';
export { autoSwitchMode, setAutoSwitchMode } from './constants.js';
export const nodes = {
  N_WEST:    { id: 'N_WEST',    x: 420,  y: 1450 },
  N_CENTRAL: { id: 'N_CENTRAL', x: 1450, y: 1500 },
  N_NORTH_J: { id: 'N_NORTH_J', x: 1850, y: 1120 },
  N_NORTH:   { id: 'N_NORTH',   x: 2450, y: 520  },
  N_PASS:    { id: 'N_PASS',    x: 3650, y: 780  },
  N_EAST_J:  { id: 'N_EAST_J',  x: 3450, y: 1650 },
  N_FACTORY: { id: 'N_FACTORY', x: 2650, y: 1620 },
  N_SOUTH:   { id: 'N_SOUTH',   x: 2850, y: 2480 },
  N_VALLEY:  { id: 'N_VALLEY',  x: 1150, y: 2380 }
};

export const segments = [
  new TrackSegment('S1', 'Западный подход', nodes.N_WEST, nodes.N_CENTRAL, [nodes.N_WEST, { x: 750, y: 1320 }, { x: 1120, y: 1560 }, nodes.N_CENTRAL], 150),
  new TrackSegment('S2', 'Центральная горловина', nodes.N_CENTRAL, nodes.N_NORTH_J, [nodes.N_CENTRAL, { x: 1660, y: 1440 }, nodes.N_NORTH_J], 120),
  new TrackSegment('S3', 'Северный обход', nodes.N_NORTH_J, nodes.N_NORTH, [nodes.N_NORTH_J, { x: 1960, y: 780 }, { x: 2200, y: 550 }, nodes.N_NORTH], 145),
  new TrackSegment('S4', 'Горный серпантин', nodes.N_NORTH, nodes.N_PASS, [nodes.N_NORTH, { x: 2850, y: 460 }, { x: 3280, y: 580 }, nodes.N_PASS], 115),
  new TrackSegment('S5', 'Восточный спуск', nodes.N_PASS, nodes.N_EAST_J, [nodes.N_PASS, { x: 3860, y: 1150 }, { x: 3680, y: 1480 }, nodes.N_EAST_J], 130),
  new TrackSegment('S6', 'Заводская ветка', nodes.N_NORTH_J, nodes.N_FACTORY, [nodes.N_NORTH_J, { x: 2150, y: 1220 }, { x: 2420, y: 1560 }, nodes.N_FACTORY], 135),
  new TrackSegment('S7', 'Индустриальный перегон', nodes.N_FACTORY, nodes.N_EAST_J, [nodes.N_FACTORY, { x: 3050, y: 1680 }, nodes.N_EAST_J], 145),
  new TrackSegment('S8', 'Портовая магистраль', nodes.N_EAST_J, nodes.N_SOUTH, [nodes.N_EAST_J, { x: 3320, y: 2120 }, { x: 3120, y: 2420 }, nodes.N_SOUTH], 140),
  new TrackSegment('S9', 'Южный берег', nodes.N_SOUTH, nodes.N_VALLEY, [nodes.N_SOUTH, { x: 2350, y: 2620 }, { x: 1750, y: 2560 }, nodes.N_VALLEY], 155),
  new TrackSegment('S10', 'Речной мост', nodes.N_VALLEY, nodes.N_CENTRAL, [nodes.N_VALLEY, { x: 960, y: 2050 }, { x: 1220, y: 1750 }, nodes.N_CENTRAL], 135)
];

export const segmentMap = Object.fromEntries(segments.map(s => [s.id, s]));

export const switches = [
  { id: 'SW1', nodeId: 'N_NORTH_J', x: nodes.N_NORTH_J.x, y: nodes.N_NORTH_J.y, branches: ['S3', 'S6'], activeIndex: 0 },
  { id: 'SW2', nodeId: 'N_EAST_J', x: nodes.N_EAST_J.x, y: nodes.N_EAST_J.y, branches: ['S5', 'S7'], activeIndex: 1 },
  { id: 'SW3', nodeId: 'N_CENTRAL', x: nodes.N_CENTRAL.x, y: nodes.N_CENTRAL.y, branches: ['S1', 'S10'], activeIndex: 0 }
];

export const stations = [
  { id: 'ST_CENT', name: 'Центральный Вокзал', segmentId: 'S1', distRatio: 0.92, side: -1, color: '#58a6ff' },
  { id: 'ST_NORT', name: 'Северный Узел', segmentId: 'S3', distRatio: 0.88, side: -1, color: '#3fb950' },
  { id: 'ST_PASS', name: 'Горный Перевал', segmentId: 'S4', distRatio: 0.90, side: -1, color: '#d29922' },
  { id: 'ST_FACT', name: 'Заводская', segmentId: 'S7', distRatio: 0.22, side: 1, color: '#f85149' },
  { id: 'ST_SOUT', name: 'Южный Порт', segmentId: 'S8', distRatio: 0.92, side: 1, color: '#a371f7' },
  { id: 'ST_VALL', name: 'Речная Долина', segmentId: 'S10', distRatio: 0.15, side: 1, color: '#39c5cf' }
];

export const stationMap = Object.fromEntries(stations.map(st => [st.id, st]));

stations.forEach(st => {
  const seg = segmentMap[st.segmentId];
  const pt = seg.getPointAt(seg.length * st.distRatio, 1);
  st.x = pt.x;
  st.y = pt.y;
  st.angle = pt.angle;
  st.targetDist = seg.length * st.distRatio;
});

export const trees = [];
for (let i = 0; i < 420; i++) {
  const tx = 120 + Math.random() * (WORLD_W - 240);
  const ty = 120 + Math.random() * (WORLD_H - 240);
  let nearTrack = false;
  for (const seg of segments) {
    for (let j = 0; j < seg.samples.length; j += 4) {
      if (Math.hypot(tx - seg.samples[j].x, ty - seg.samples[j].y) < 95) {
        nearTrack = true;
        break;
      }
    }
    if (nearTrack) break;
  }
  if (!nearTrack) {
    trees.push({ x: tx, y: ty, r: 14 + Math.random() * 18, shade: Math.random() > 0.5 ? '#1f422b' : '#264e34' });
  }
}

export const buildings = [
  { x: 1320, y: 1310, w: 130, h: 70, angle: 0.1, color: '#3b434d' },
  { x: 1180, y: 1370, w: 90,  h: 60, angle: -0.1, color: '#48525e' },
  { x: 2560, y: 1740, w: 190, h: 95, angle: 0.05, color: '#4d3b38' },
  { x: 2780, y: 1760, w: 120, h: 80, angle: 0.05, color: '#3f4752' },
  { x: 2820, y: 2600, w: 160, h: 75, angle: -0.2, color: '#394956' },
  { x: 2380, y: 390,  w: 110, h: 55, angle: 0.15, color: '#4a463d' }
];
export let editorSegments = TRACK_DATA.segments;
export let editorStations = TRACK_DATA.stations;
export let editorSwitches = TRACK_DATA.switches;

export function getPointOnSegment(seg, t) {
    if (seg.type === 'line') {
        const x = seg.start.x + (seg.end.x - seg.start.x) * t;
        const y = seg.start.y + (seg.end.y - seg.start.y) * t;
        const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
        return { x, y, angle };
    }

    if (seg.type === 'curve') {
        const invT = 1 - t;
        const x = invT * invT * seg.start.x + 2 * invT * t * seg.control.x + t * t * seg.end.x;
        const y = invT * invT * seg.start.y + 2 * invT * t * seg.control.y + t * t * seg.end.y;

        const dx = 2 * invT * (seg.control.x - seg.start.x) + 2 * t * (seg.end.x - seg.control.x);
        const dy = 2 * invT * (seg.control.y - seg.start.y) + 2 * t * (seg.end.y - seg.control.y);
        const angle = Math.atan2(dy, dx);
        return { x, y, angle };
    }
}

export function getSegmentLength(seg) {
    if (seg.type === 'line') {
        return Math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y);
    }
    let length = 0;
    let prev = getPointOnSegment(seg, 0);
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
        const curr = getPointOnSegment(seg, i / steps);
        length += Math.hypot(curr.x - prev.x, curr.y - prev.y);
        prev = curr;
    }
    return length;
}

export function drawTracks(ctx) {
    ctx.lineCap = 'round';
    for (const seg of editorSegments) {
        ctx.beginPath();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 14;
        traceSegmentPath(ctx, seg);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 4;
        traceSegmentPath(ctx, seg);
        ctx.stroke();
    }
}

function traceSegmentPath(ctx, seg) {
    ctx.moveTo(seg.start.x, seg.start.y);
    if (seg.type === 'line') {
        ctx.lineTo(seg.end.x, seg.end.y);
    } else if (seg.type === 'curve') {
        ctx.quadraticCurveTo(seg.control.x, seg.control.y, seg.end.x, seg.end.y);
    }
}
