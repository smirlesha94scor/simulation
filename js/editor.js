import { segments, stations, switches, getPointOnSegment } from './topology.js';
import { camera, WORLD_W, WORLD_H } from './constants.js';

export let editorEnabled = false;
let tool = 'pan'; // 'pan' | 'line' | 'curve' | 'move' | 'station' | 'switch'
let tempStart = null;
let draggingPoints = [];
let isPanning = false;
let panLastX = 0;
let panLastY = 0;
const SNAP_RADIUS = 20;

function screenToWorld(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const zoom = camera?.zoom || 1;
    const camX = camera?.x ?? canvas.width / 2;
    const camY = camera?.y ?? canvas.height / 2;

    return {
        x: (screenX - canvas.width / 2) / zoom + camX,
        y: (screenY - canvas.height / 2) / zoom + camY
    };
}

function findClosestSegmentPoint(worldPos, maxDist = 30) {
    let best = null;
    let minDist = maxDist;

    if (!Array.isArray(segments)) return null;
    for (const seg of segments) {
        if (!seg || !seg.start || !seg.end) continue;
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            const pt = getPointOnSegment(seg, t);
            if (!pt) continue;
            const d = Math.hypot(pt.x - worldPos.x, pt.y - worldPos.y);
            if (d < minDist) {
                minDist = d;
                best = { seg, t: Number(t.toFixed(2)), x: pt.x, y: pt.y, angle: pt.angle };
            }
        }
    }
    return best;
}

export function initEditor(canvas) {
    const panel = document.createElement('div');
    panel.style.cssText = `
        position: fixed; bottom: 20px; left: 20px; z-index: 1000;
        background: rgba(15, 23, 42, 0.94); color: #f8fafc;
        padding: 10px 14px; border-radius: 10px; border: 1px solid #334155;
        font-family: sans-serif; font-size: 13px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    `;
    panel.innerHTML = `
        <button id="ed-toggle" style="padding:6px 10px; cursor:pointer; background:#2563eb; color:#fff; border:none; border-radius:6px; font-weight:600;">Редактор: ВЫКЛ</button>
        <div id="ed-tools" style="display:none; flex-wrap:wrap; gap:6px; align-items:center;">
            <button data-tool="pan" style="padding:6px 10px; cursor:pointer; outline:2px solid #38bdf8;">🖐 Рука</button>
            <button data-tool="line" style="padding:6px 10px; cursor:pointer;">📏 Прямая</button>
            <button data-tool="curve" style="padding:6px 10px; cursor:pointer;">↪️ Поворот</button>
            <button data-tool="station" style="padding:6px 10px; cursor:pointer;">🚉 Платформа</button>
            <button data-tool="switch" style="padding:6px 10px; cursor:pointer;">🔀 Стрелка</button>
            <button data-tool="move" style="padding:6px 10px; cursor:pointer;">🎯 Двигать точки</button>
            <button id="ed-undo" style="padding:6px 10px; cursor:pointer; background:#dc2626; color:#fff; border:none; border-radius:6px;">Отмена</button>
            <button id="ed-export" style="padding:6px 10px; cursor:pointer; background:#16a34a; color:#fff; border:none; border-radius:6px;">📋 Код трассы</button>
        </div>
    `;
    document.body.appendChild(panel);

    const toggleBtn = panel.querySelector('#ed-toggle');
    const toolsBox = panel.querySelector('#ed-tools');

    function setActiveTool(newTool) {
        tool = newTool;
        tempStart = null;
        draggingPoints = [];
        isPanning = false;
        panel.querySelectorAll('[data-tool]').forEach(b => {
            b.style.outline = b.dataset.tool === tool ? '2px solid #38bdf8' : 'none';
        });
        if (editorEnabled) {
            canvas.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
        }
    }

    toggleBtn.onclick = () => {
        editorEnabled = !editorEnabled;
        toggleBtn.textContent = editorEnabled ? 'Редактор: ВКЛ' : 'Редактор: ВЫКЛ';
        toggleBtn.style.background = editorEnabled ? '#f59e0b' : '#2563eb';
        toolsBox.style.display = editorEnabled ? 'flex' : 'none';
        if (editorEnabled) {
            if (camera) camera.followTrainId = null; // Отвязываем камеру от поезда
            setActiveTool('pan');
        } else {
            tempStart = null;
            draggingPoints = [];
            isPanning = false;
            canvas.style.cursor = 'default';
        }
    };

    panel.querySelectorAll('[data-tool]').forEach(btn => {
        btn.onclick = () => setActiveTool(btn.dataset.tool);
    });

    panel.querySelector('#ed-undo').onclick = () => {
        if (tool === 'station' && Array.isArray(stations) && stations.length > 0) {
            stations.pop();
        } else if (tool === 'switch' && Array.isArray(switches) && switches.length > 0) {
            switches.pop();
        } else if (Array.isArray(segments) && segments.length > 0) {
            segments.pop();
        }
        tempStart = null;
        draggingPoints = [];
    };

    panel.querySelector('#ed-export').onclick = () => showExportModal();

    function getSnappedPos(x, y, excludeList = []) {
        if (Array.isArray(segments)) {
            for (const seg of segments) {
                if (!seg || !seg.start || !seg.end) continue;
                for (const pt of [seg.start, seg.end]) {
                    if (excludeList.includes(pt)) continue;
                    if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
                        if (Math.hypot(pt.x - x, pt.y - y) < SNAP_RADIUS) {
                            return { x: pt.x, y: pt.y };
                        }
                    }
                }
            }
        }
        return { x: Math.round(x / 10) * 10, y: Math.round(y / 10) * 10 };
    }

    window.addEventListener('mousedown', (e) => {
        if (!editorEnabled || e.button !== 0) return;
        if (e.target.closest('button, input, textarea, select') || panel.contains(e.target)) return;

        e.stopImmediatePropagation();
        e.preventDefault();

        // Инструмент: Рука (перемещение камеры левой кнопкой мыши)
        if (tool === 'pan') {
            isPanning = true;
            panLastX = e.clientX;
            panLastY = e.clientY;
            canvas.style.cursor = 'grabbing';
            if (camera) camera.followTrainId = null;
            return;
        }

        const worldPos = screenToWorld(canvas, e.clientX, e.clientY);

        // Инструмент: Платформа
        if (tool === 'station') {
            const hit = findClosestSegmentPoint(worldPos, 30);
            if (!hit) {
                alert('Кликните прямо по рельсу, чтобы поставить платформу.');
                return;
            }
            const defaultName = 'Станция ' + ((stations?.length || 0) + 1);
            const name = prompt('Название станции / платформы:', defaultName);
            if (!name) return;

            if (Array.isArray(stations)) {
                stations.push({
                    id: 'st_' + (stations.length + 1),
                    name: name.trim(),
                    segId: hit.seg.id,
                    t: hit.t,
                    x: Math.round(hit.x),
                    y: Math.round(hit.y)
                });
            }
            return;
        }

        // Инструмент: Стрелка
        if (tool === 'switch') {
            const snapped = getSnappedPos(worldPos.x, worldPos.y);
            const validSegs = Array.isArray(segments) ? segments.filter(s => s && s.start && s.end) : [];
            const incoming = validSegs.find(s => Math.hypot(s.end.x - snapped.x, s.end.y - snapped.y) < 5);
            const outgoing = validSegs.filter(s => Math.hypot(s.start.x - snapped.x, s.start.y - snapped.y) < 5);

            if (!incoming || outgoing.length < 2) {
                alert('Для создания стрелки кликните по стыку, где к концу одного пути присоединены минимум 2 ветки.');
                return;
            }

            if (Array.isArray(switches)) {
                const existing = switches.find(sw => sw.fromSeg === incoming.id);
                if (existing) {
                    existing.activeIndex = (existing.activeIndex + 1) % existing.branches.length;
                } else {
                    switches.push({
                        id: 'sw_' + (switches.length + 1),
                        fromSeg: incoming.id,
                        branches: outgoing.map(s => s.id),
                        activeIndex: 0,
                        x: snapped.x,
                        y: snapped.y
                    });
                }
            }
            return;
        }

        // Инструмент: Двигать точки
        if (tool === 'move') {
            draggingPoints = [];
            if (!Array.isArray(segments)) return;

            for (const seg of segments) {
                if (!seg || !seg.start || !seg.end) continue;
                for (const pt of [seg.start, seg.end]) {
                    if (pt && Math.hypot(pt.x - worldPos.x, pt.y - worldPos.y) < 18) {
                        draggingPoints.push(pt);
                    }
                }
            }

            if (draggingPoints.length === 0) {
                for (const seg of segments) {
                    if (seg && seg.type === 'curve' && seg.control) {
                        if (Math.hypot(seg.control.x - worldPos.x, seg.control.y - worldPos.y) < 18) {
                            draggingPoints.push(seg.control);
                            break;
                        }
                    }
                }
            }
            return;
        }

        // Инструменты: Прямая и Поворот
        const pos = getSnappedPos(worldPos.x, worldPos.y);
        if (!tempStart) {
            tempStart = pos;
        } else {
            const id = 'seg_' + (segments.length + 1);
            const startCopy = { x: tempStart.x, y: tempStart.y };
            const endCopy = { x: pos.x, y: pos.y };

            if (tool === 'line') {
                segments.push({ id, type: 'line', start: startCopy, end: endCopy });
            } else if (tool === 'curve') {
                const midX = (startCopy.x + endCopy.x) / 2;
                const midY = (startCopy.y + endCopy.y) / 2;
                const dx = endCopy.x - startCopy.x;
                const dy = endCopy.y - startCopy.y;
                segments.push({
                    id,
                    type: 'curve',
                    start: startCopy,
                    control: { x: Math.round(midX - dy * 0.35), y: Math.round(midY + dx * 0.35) },
                    end: endCopy
                });
            }
            tempStart = { x: endCopy.x, y: endCopy.y };
        }
    }, true);

    window.addEventListener('mousemove', (e) => {
        if (!editorEnabled) return;

        // Перемещение камеры при активном инструменте "Рука"
        if (isPanning && camera) {
            e.stopImmediatePropagation();
            const zoom = camera.zoom || 1;
            const dx = (e.clientX - panLastX) / zoom;
            const dy = (e.clientY - panLastY) / zoom;
            panLastX = e.clientX;
            panLastY = e.clientY;

            const nextX = Math.max(0, Math.min(WORLD_W || 5000, camera.x - dx));
            const nextY = Math.max(0, Math.min(WORLD_H || 5000, camera.y - dy));

            camera.x = nextX;
            camera.y = nextY;
            camera.targetX = nextX;
            camera.targetY = nextY;
            return;
        }

        // Перемещение точек пути
        if (draggingPoints.length > 0) {
            e.stopImmediatePropagation();
            const worldPos = screenToWorld(canvas, e.clientX, e.clientY);
            const snapped = getSnappedPos(worldPos.x, worldPos.y, draggingPoints);

            for (const pt of draggingPoints) {
                pt.x = snapped.x;
                pt.y = snapped.y;
            }
        }
    }, true);

    window.addEventListener('mouseup', (e) => {
        if (isPanning) {
            e.stopImmediatePropagation();
            isPanning = false;
            canvas.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
        }
        if (draggingPoints.length > 0) {
            e.stopImmediatePropagation();
            draggingPoints = [];
        }
    }, true);
}

export function drawEditorOverlay(ctx) {
    if (Array.isArray(stations) && Array.isArray(segments)) {
        for (const st of stations) {
            const seg = segments.find(s => s && s.id === st.segId);
            if (!seg || !seg.start || !seg.end) continue;
            const pt = getPointOnSegment(seg, st.t ?? 0.5);
            if (!pt) continue;

            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.angle);

            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.fillRect(-45, -24, 90, 14);
            ctx.strokeRect(-45, -24, 90, 14);

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(st.name || 'Станция', 0, -30);
            ctx.restore();
        }
    }

    if (Array.isArray(switches) && Array.isArray(segments)) {
        for (const sw of switches) {
            const fromSeg = segments.find(s => s && s.id === sw.fromSeg);
            if (!fromSeg || !fromSeg.end) continue;

            ctx.save();
            ctx.fillStyle = '#10b981';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(fromSeg.end.x, fromSeg.end.y, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    if (!editorEnabled) return;

    if (Array.isArray(segments)) {
        for (const seg of segments) {
            if (!seg || !seg.start || !seg.end) continue;

            ctx.fillStyle = '#38bdf8';
            for (const pt of [seg.start, seg.end]) {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            if (seg.type === 'curve' && seg.control) {
                ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(seg.start.x, seg.start.y);
                ctx.lineTo(seg.control.x, seg.control.y);
                ctx.lineTo(seg.end.x, seg.end.y);
                ctx.stroke();

                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                ctx.arc(seg.control.x, seg.control.y, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    if (tempStart) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(tempStart.x, tempStart.y, 7, 0, Math.PI * 2);
        ctx.fill();
    }
}

function showExportModal() {
    const cleanSegments = Array.isArray(segments) ? segments.filter(s => s && s.start && s.end) : [];
    const code = `export const TRACK_DATA = ${JSON.stringify({
        segments: cleanSegments,
        stations: stations || [],
        switches: switches || []
    }, null, 4)};`;

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 2000;
        display: flex; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
        <div style="background:#1e293b; color:#fff; padding:20px; border-radius:12px; width:600px; max-width:90%;">
            <h3 style="margin-top:0;">Скопируйте и вставьте целиком в файл mapData.js</h3>
            <textarea style="width:100%; height:300px; background:#0f172a; color:#38bdf8; font-family:monospace; padding:10px; border-radius:6px;">${code}</textarea>
            <div style="margin-top:12px; display:flex; gap:10px; justify-content:flex-end;">
                <button id="copy-btn" style="padding:8px 14px; background:#2563eb; color:#fff; border:none; border-radius:6px; cursor:pointer;">Скопировать</button>
                <button id="close-btn" style="padding:8px 14px; background:#475569; color:#fff; border:none; border-radius:6px; cursor:pointer;">Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#copy-btn').onclick = () => {
        navigator.clipboard.writeText(code);
        modal.querySelector('#copy-btn').textContent = 'Скопировано!';
    };
    modal.querySelector('#close-btn').onclick = () => modal.remove();
}
