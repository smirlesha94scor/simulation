import { segments, stations, switches } from './topology.js';
import { camera } from './constants.js';

export let editorEnabled = false;
let tool = 'line'; // 'line' | 'curve' | 'move'
let tempStart = null;
let draggingPoint = null;
const SNAP_RADIUS = 20;

// Перевод экранных координат клика мыши в мировые координаты карты с учётом камеры
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

export function initEditor(canvas) {
    const panel = document.createElement('div');
    panel.style.cssText = `
        position: fixed; bottom: 20px; left: 20px; z-index: 1000;
        background: rgba(15, 23, 42, 0.92); color: #f8fafc;
        padding: 12px 16px; border-radius: 10px; border: 1px solid #334155;
        font-family: sans-serif; font-size: 13px; display: flex; gap: 8px; align-items: center;
    `;
    panel.innerHTML = `
        <button id="ed-toggle" style="padding:6px 10px; cursor:pointer; background:#2563eb; color:#fff; border:none; border-radius:6px;">Редактор: ВЫКЛ</button>
        <div id="ed-tools" style="display:none; gap:6px; align-items:center;">
            <button data-tool="line" style="padding:6px 10px; cursor:pointer;">📏 Прямая</button>
            <button data-tool="curve" style="padding:6px 10px; cursor:pointer;">↪️ Плавный поворот</button>
            <button data-tool="move" style="padding:6px 10px; cursor:pointer;">✋ Двигать точки</button>
            <button id="ed-undo" style="padding:6px 10px; cursor:pointer; background:#dc2626; color:#fff; border:none; border-radius:6px;">Отменить</button>
            <button id="ed-export" style="padding:6px 10px; cursor:pointer; background:#16a34a; color:#fff; border:none; border-radius:6px;">📋 Код трассы</button>
        </div>
    `;
    document.body.appendChild(panel);

    const toggleBtn = panel.querySelector('#ed-toggle');
    const toolsBox = panel.querySelector('#ed-tools');

    toggleBtn.onclick = () => {
        editorEnabled = !editorEnabled;
        toggleBtn.textContent = editorEnabled ? 'Редактор: ВКЛ' : 'Редактор: ВЫКЛ';
        toggleBtn.style.background = editorEnabled ? '#f59e0b' : '#2563eb';
        toolsBox.style.display = editorEnabled ? 'flex' : 'none';
        tempStart = null;
    };

    panel.querySelectorAll('[data-tool]').forEach(btn => {
        btn.onclick = () => {
            tool = btn.dataset.tool;
            tempStart = null;
        };
    });

    panel.querySelector('#ed-undo').onclick = () => {
        if (Array.isArray(segments) && segments.length > 0) {
            segments.pop();
        }
        tempStart = null;
    };

    panel.querySelector('#ed-export').onclick = () => showExportModal();

    // Безопасная магнитная привязка (игнорирует сегменты без start/end)
    function getSnappedPos(x, y) {
        if (Array.isArray(segments)) {
            for (const seg of segments) {
                if (!seg || !seg.start || !seg.end) continue;
                for (const pt of [seg.start, seg.end]) {
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

    canvas.addEventListener('mousedown', (e) => {
        if (!editorEnabled || e.button !== 0) return;
        const worldPos = screenToWorld(canvas, e.clientX, e.clientY);

        if (tool === 'move') {
            if (!Array.isArray(segments)) return;
            for (const seg of segments) {
                if (!seg || !seg.start || !seg.end) continue;
                const pts = seg.type === 'curve' && seg.control ? [seg.start, seg.control, seg.end] : [seg.start, seg.end];
                for (const pt of pts) {
                    if (pt && Math.hypot(pt.x - worldPos.x, pt.y - worldPos.y) < 18) {
                        draggingPoint = pt;
                        return;
                    }
                }
            }
            return;
        }

        const pos = getSnappedPos(worldPos.x, worldPos.y);
        if (!tempStart) {
            tempStart = pos;
        } else {
            const id = 'seg_' + (segments.length + 1);
            if (tool === 'line') {
                segments.push({ id, type: 'line', start: tempStart, end: pos });
            } else if (tool === 'curve') {
                const midX = (tempStart.x + pos.x) / 2;
                const midY = (tempStart.y + pos.y) / 2;
                const dx = pos.x - tempStart.x;
                const dy = pos.y - tempStart.y;
                segments.push({
                    id,
                    type: 'curve',
                    start: tempStart,
                    control: { x: Math.round(midX - dy * 0.35), y: Math.round(midY + dx * 0.35) },
                    end: pos
                });
            }
            tempStart = { x: pos.x, y: pos.y };
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!editorEnabled || !draggingPoint) return;
        const worldPos = screenToWorld(canvas, e.clientX, e.clientY);
        draggingPoint.x = Math.round(worldPos.x / 10) * 10;
        draggingPoint.y = Math.round(worldPos.y / 10) * 10;
    });

    window.addEventListener('mouseup', () => {
        draggingPoint = null;
    });
}

export function drawEditorOverlay(ctx) {
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
    const code = `export const TRACK_DATA = ${JSON.stringify({ segments: cleanSegments, stations: stations || [], switches: switches || [] }, null, 4)};`;
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
