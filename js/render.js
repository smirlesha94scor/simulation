import { canvas, ctx, miniCanvas, miniCtx, camera, WORLD_W, WORLD_H, autoSwitchMode } from './constants.js';
import { segments, segmentMap, stations, switches, trees, buildings } from './topology.js';
import { trains } from './train.js';
import { drawTracks } from './topology.js';
import { drawEditorOverlay } from './editor.js';
export function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  ctx.fillStyle = '#1b2821';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 2;
  for (let gx = 0; gx <= WORLD_W; gx += 200) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, WORLD_H); ctx.stroke();
  }
  for (let gy = 0; gy <= WORLD_H; gy += 200) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(WORLD_W, gy); ctx.stroke();
  }

  // Река
  ctx.save();
  ctx.strokeStyle = '#16354d';
  ctx.lineWidth = 115;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(650, 0);
  ctx.bezierCurveTo(850, 950, 1250, 1850, 820, WORLD_H);
  ctx.stroke();

  ctx.strokeStyle = '#1d4766';
  ctx.lineWidth = 85;
  ctx.stroke();
  ctx.restore();

  // Здания и деревья
  for (const b of buildings) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-b.w / 2 + 6, -b.h / 2 + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.restore();
  }

  for (const t of trees) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.arc(t.x + 4, t.y + 4, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.shade;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
  }

  // Пути
  for (const seg of segments) {
    ctx.strokeStyle = '#36393d';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    seg.samples?.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    if (camera.zoom > 0.36) {
      ctx.strokeStyle = '#231f1e';
      ctx.lineWidth = 3;
      for (let d = 0; d < seg.length; d += 12) {
        const pt = seg.getPointAt(d, 1);
        const nx = -Math.sin(pt.angle) * 9;
        const ny = Math.cos(pt.angle) * 9;
        ctx.beginPath();
        ctx.moveTo(pt.x - nx, pt.y - ny);
        ctx.lineTo(pt.x + nx, pt.y + ny);
        ctx.stroke();
      }
    }

    for (const railOffset of [-4.5, 4.5]) {
      ctx.strokeStyle = '#9aa5b1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      seg.samples?.forEach((p, idx) => {
        const rx = p.x - Math.sin(p.angle) * railOffset;
        const ry = p.y + Math.cos(p.angle) * railOffset;
        idx === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
      });
      ctx.stroke();
    }
  }

  // Станции
  for (const st of stations) {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(st.angle);
    const platY = st.side * 24;
    ctx.fillStyle = '#4c5664';
    ctx.fillRect(-95, platY - 11, 190, 22);
    ctx.strokeStyle = '#e5c07b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-95, platY - st.side * 9);
    ctx.lineTo(95, platY - st.side * 9);
    ctx.stroke();
    ctx.fillStyle = st.color;
    ctx.fillRect(-45, platY + st.side * 12, 90, 24);
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 15px Segoe UI, sans-serif';
    const textW = ctx.measureText(st.name).width;
    const labelY = st.y + (st.side === -1 ? -54 : 64);
    ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
    ctx.beginPath();
    ctx.roundRect(st.x - textW / 2 - 10, labelY - 14, textW + 20, 24, 6);
    ctx.fill();
    ctx.strokeStyle = st.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#f0f6fc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.name, st.x, labelY - 2);
    ctx.restore();
  }

  // Стрелки
  for (const sw of switches) {
    const activeSeg = segmentMap[sw.branches[sw.activeIndex]];
    const dirPt = activeSeg.fromNode.id === sw.nodeId ? activeSeg.getPointAt(35, 1) : activeSeg.getPointAt(35, -1);

    ctx.strokeStyle = '#3fb950';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sw.x, sw.y);
    ctx.lineTo(dirPt.x, dirPt.y);
    ctx.stroke();

    ctx.fillStyle = autoSwitchMode ? '#1f6feb' : '#d29922';
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
drawTracks(ctx);
  // Поезда
  for (const tr of trains) {
    const isSelected = camera.followTrainId === tr.id;
    for (let i = tr.carTransforms.length - 1; i >= 0; i--) {
      const car = tr.carTransforms[i];
      const isLoco = i === 0;

      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-19, -11, 38, 22);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-15, -7, 34, 18);

      ctx.fillStyle = isLoco ? tr.color : '#d0d7de';
      ctx.beginPath();
      ctx.roundRect(-16, -8, 32, 16, isLoco ? [3, 6, 6, 3] : 3);
      ctx.fill();

      ctx.fillStyle = isLoco ? 'rgba(0,0,0,0.28)' : tr.color;
      ctx.fillRect(-12, -3, 24, 6);

      if (isLoco) {
        ctx.fillStyle = '#fff3bf';
        ctx.beginPath();
        ctx.arc(16, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const hp = tr.headPos;
    ctx.save();
    ctx.font = 'bold 12px Segoe UI, sans-serif';
    const label = `${tr.number}`;
    const lw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(13, 17, 23, 0.88)';
    ctx.beginPath();
    ctx.roundRect(hp.x - lw / 2 - 7, hp.y - 34, lw + 14, 20, 5);
    ctx.fill();
    ctx.strokeStyle = tr.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, hp.x, hp.y - 24);
    ctx.restore();
  }
drawEditorOverlay(ctx);
  ctx.restore();
}

export function drawMinimap() {
  const mw = miniCanvas.width;
  const mh = miniCanvas.height;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;

  miniCtx.fillStyle = '#131b17';
  miniCtx.fillRect(0, 0, mw, mh);

  miniCtx.strokeStyle = '#57606a';
  miniCtx.lineWidth = 2;
  for (const seg of segments) {
    miniCtx.beginPath();
    seg.samples?.forEach((p, i) => {
      i === 0 ? miniCtx.moveTo(p.x * sx, p.y * sy) : miniCtx.lineTo(p.x * sx, p.y * sy);
    });
    miniCtx.stroke();
  }

  for (const st of stations) {
    miniCtx.fillStyle = st.color;
    miniCtx.beginPath();
    miniCtx.arc(st.x * sx, st.y * sy, 3.2, 0, Math.PI * 2);
    miniCtx.fill();
  }

  for (const tr of trains) {
    miniCtx.fillStyle = '#fff';
    miniCtx.beginPath();
    miniCtx.arc(tr.headPos.x * sx, tr.headPos.y * sy, 3.8, 0, Math.PI * 2);
    miniCtx.fill();
    miniCtx.fillStyle = tr.color;
    miniCtx.beginPath();
    miniCtx.arc(tr.headPos.x * sx, tr.headPos.y * sy, 2.5, 0, Math.PI * 2);
    miniCtx.fill();
  }

  const viewW = (canvas.width / camera.zoom) * sx;
  const viewH = (canvas.height / camera.zoom) * sy;
  const viewX = camera.x * sx - viewW / 2;
  const viewY = camera.y * sy - viewH / 2;

  miniCtx.strokeStyle = '#58a6ff';
  miniCtx.lineWidth = 1.5;
  miniCtx.strokeRect(viewX, viewY, viewW, viewH);
}
