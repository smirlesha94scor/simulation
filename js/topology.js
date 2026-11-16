import { WORLD_W, WORLD_H } from './constants.js';
import { TrackSegment } from './math.js';
import { TRACK_DATA } from './mapData.js';
export { autoSwitchMode, setAutoSwitchMode } from './constants.js';

// 1. Загружаем сегменты из mapData.js и приводим их к формату, понятному и симулятору, и редактору
const rawSegments = Array.isArray(TRACK_DATA?.segments) ? TRACK_DATA.segments : [];
const rawStations = Array.isArray(TRACK_DATA?.stations) ? TRACK_DATA.stations : [];
const rawSwitches = Array.isArray(TRACK_DATA?.switches) ? TRACK_DATA.switches : [];

export const nodes = {};

// Генерируем промежуточные точки для кривой Безье, чтобы поезда плавно ехали по путям из редактора
function buildPolylinePoints(seg) {
    if (seg.type === 'line') {
        return [{ x: seg.start.x, y: seg.start.y }, { x: seg.end.x, y: seg.end.y }];
    }
    const pts = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
        const pt = getPointOnSegment(seg, i / steps);
        if (pt) pts.push({ x: pt.x, y: pt.y });
    }
    return pts;
}

export const segments = rawSegments.map((seg, idx) => {
    const id = seg.id || `seg_${idx + 1}`;
    const fromId = `N_${seg.start.x}_${seg.start.y}`;
    const toId = `N_${seg.end.x}_${seg.end.y}`;

    if (!nodes[fromId]) nodes[fromId] = { id: fromId, x: seg.start.x, y: seg.start.y };
    if (!nodes[toId]) nodes[toId] = { id: toId, x: seg.end.x, y: seg.end.y };

    const pts = buildPolylinePoints(seg);
    const ts = new TrackSegment(id, seg.name || `Участок ${idx + 1}`, nodes[fromId], nodes[toId], pts, seg.maxSpeed || 130);

    // Сохраняем свойства редактора (type, start, control, end), чтобы редактор мог их двигать и экспортировать
    ts.type = seg.type || 'line';
    ts.start = { x: seg.start.x, y: seg.start.y };
    ts.end = { x: seg.end.x, y: seg.end.y };
    if (seg.control) {
        ts.control = { x: seg.control.x, y: seg.control.y };
    }
    return ts;
});

export const segmentMap = Object.fromEntries(segments.map(s => [s.id, s]));

// 2. Стрелки из mapData.js
export const switches = rawSwitches.map((sw, idx) => {
    const fromSeg = segmentMap[sw.fromSeg];
    const x = sw.x ?? fromSeg?.end?.x ?? 0;
    const y = sw.y ?? fromSeg?.end?.y ?? 0;
    const nodeId = sw.nodeId || `N_${x}_${y}`;
    return {
        id: sw.id || `SW_${idx + 1}`,
        nodeId,
        fromSeg: sw.fromSeg,
        x,
        y,
        branches: Array.isArray(sw.branches) ? [...sw.branches] : [],
        activeIndex: sw.activeIndex ?? 0
    };
});

// 3. Станции / платформы из mapData.js
const STATION_COLORS = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#a371f7', '#39c5cf'];

export const stations = rawStations.map((st, idx) => {
    const segId = st.segId || st.segmentId;
    const ratio = st.t ?? st.distRatio ?? 0.5;
    const seg = segmentMap[segId];

    let x = st.x ?? 0;
    let y = st.y ?? 0;
    let angle = 0;
    let targetDist = 0;

    if (seg && seg.length > 0) {
        const pt = seg.getPointAt(seg.length * ratio, 1);
        x = pt.x;
        y = pt.y;
        angle = pt.angle;
        targetDist = seg.length * ratio;
    }

    return {
        id: st.id || `ST_${idx + 1}`,
        name: st.name || `Станция ${idx + 1}`,
        segId,
        segmentId: segId,
        t: ratio,
        distRatio: ratio,
        side: st.side ?? -1,
        color: st.color || STATION_COLORS[idx % STATION_COLORS.length],
        x,
        y,
        angle,
        targetDist
    };
});

export const stationMap = Object.fromEntries(stations.map(st => [st.id, st]));

// 4. Деревья и здания (генерируются вокруг путей из mapData.js)
export const trees = [];
for (let i = 0; i < 420; i++) {
    const tx = 120 + Math.random() * (WORLD_W - 240);
    const ty = 120 + Math.random() * (WORLD_H - 240);
    let nearTrack = false;
    for (const seg of segments) {
        if (!Array.isArray(seg.samples)) continue;
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

// 5. Геометрия сегментов для редактора
export function getPointOnSegment(seg, t) {
    if (!seg || !seg.start || !seg.end) return null;

    if (seg.type === 'line') {
        const x = seg.start.x + (seg.end.x - seg.start.x) * t;
        const y = seg.start.y + (seg.end.y - seg.start.y) * t;
        const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
        return { x, y, angle };
    }

    if (seg.type === 'curve' && seg.control) {
        const invT = 1 - t;
        const x = invT * invT * seg.start.x + 2 * invT * t * seg.control.x + t * t * seg.end.x;
        const y = invT * invT * seg.start.y + 2 * invT * t * seg.control.y + t * t * seg.end.y;

        const dx = 2 * invT * (seg.control.x - seg.start.x) + 2 * t * (seg.end.x - seg.control.x);
        const dy = 2 * invT * (seg.control.y - seg.start.y) + 2 * t * (seg.end.y - seg.control.y);
        const angle = Math.atan2(dy, dx);
        return { x, y, angle };
    }

    return null;
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
        if (curr && prev) {
            length += Math.hypot(curr.x - prev.x, curr.y - prev.y);
        }
        prev = curr;
    }
    return length;
}

// Отрисовка путей, добавленных в реальном времени в редакторе (у которых ещё нет seg.samples)
export function drawTracks(ctx) {
    if (!Array.isArray(segments)) return;
    ctx.save();
    ctx.lineCap = 'round';

    for (const seg of segments) {
        // Если у сегмента уже есть seg.samples, его отрисовывает основной цикл в render.js со шпалами и рельсами
        if (!seg || !seg.start || !seg.end || Array.isArray(seg.samples)) continue;

        ctx.beginPath();
        ctx.strokeStyle = '#36393d';
        ctx.lineWidth = 24;
        traceSegmentPath(ctx, seg);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#9aa5b1';
        ctx.lineWidth = 6;
        traceSegmentPath(ctx, seg);
        ctx.stroke();
    }

    ctx.restore();
}

function traceSegmentPath(ctx, seg) {
    ctx.moveTo(seg.start.x, seg.start.y);
    if (seg.type === 'line') {
        ctx.lineTo(seg.end.x, seg.end.y);
    } else if (seg.type === 'curve' && seg.control) {
        ctx.quadraticCurveTo(seg.control.x, seg.control.y, seg.end.x, seg.end.y);
    }
}
