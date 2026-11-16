import { canvas, camera, keysPressed, WORLD_W, WORLD_H, miniCanvas } from './constants.js';
import { switches } from './topology.js';
import { trains } from './train.js';
import { updateFollowUI } from './ui.js';

window.addEventListener('keydown', e => { keysPressed[e.code] = true; });
window.addEventListener('keyup', e => { keysPressed[e.code] = false; });

export function screenToWorld(sx, sy) {
  return {
    x: (sx - canvas.width / 2) / camera.zoom + camera.x,
    y: (sy - canvas.height / 2) / camera.zoom + camera.y
  };
}

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.14 : 1 / 1.14;
  const newZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.targetZoom * zoomFactor));

  const worldBefore = screenToWorld(e.clientX, e.clientY);
  camera.targetZoom = newZoom;

  if (!camera.followTrainId) {
    camera.targetX = worldBefore.x - (e.clientX - canvas.width / 2) / newZoom;
    camera.targetY = worldBefore.y - (e.clientY - canvas.height / 2) / newZoom;
  }
}, { passive: false });

let isDragging = false;
let dragStart = { x: 0, y: 0 };
let camStart = { x: 0, y: 0 };
let dragMoved = false;

canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  isDragging = true;
  dragMoved = false;
  dragStart = { x: e.clientX, y: e.clientY };
  camStart = { x: camera.targetX, y: camera.targetY };
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  if (Math.hypot(dx, dy) > 4) {
    dragMoved = true;
    camera.followTrainId = null;
    updateFollowUI();
  }
  camera.targetX = camStart.x - dx / camera.zoom;
  camera.targetY = camStart.y - dy / camera.zoom;
});

window.addEventListener('mouseup', e => {
  if (!isDragging) return;
  isDragging = false;
  if (!dragMoved) {
    handleMapClick(e.clientX, e.clientY);
  }
});

function handleMapClick(sx, sy) {
  const wp = screenToWorld(sx, sy);

  for (const sw of switches) {
    if (Math.hypot(wp.x - sw.x, wp.y - sw.y) < 38) {
      sw.activeIndex = (sw.activeIndex + 1) % sw.branches.length;
      return;
    }
  }

  for (const tr of trains) {
    for (const car of tr.carTransforms) {
      if (Math.hypot(wp.x - car.x, wp.y - car.y) < 28) {
        camera.followTrainId = tr.id;
        updateFollowUI();
        return;
      }
    }
  }
}

let miniDragging = false;
function moveCameraFromMinimap(e) {
  const rect = miniCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  camera.followTrainId = null;
  updateFollowUI();
  camera.targetX = (mx / miniCanvas.width) * WORLD_W;
  camera.targetY = (my / miniCanvas.height) * WORLD_H;
}
miniCanvas.addEventListener('mousedown', e => { miniDragging = true; moveCameraFromMinimap(e); });
window.addEventListener('mousemove', e => { if (miniDragging) moveCameraFromMinimap(e); });
window.addEventListener('mouseup', () => { miniDragging = false; });