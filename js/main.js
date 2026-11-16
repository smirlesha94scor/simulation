import { canvas, camera, keysPressed, WORLD_W, WORLD_H, simSpeed, setSimTime, resizeCanvas } from './constants.js';
import { trains } from './train.js';
import { renderScheduleUI, formatTime } from './ui.js';
import { drawWorld, drawMinimap } from './render.js';
import { initEditor, drawEditorOverlay } from './editor.js';
import { drawTracks } from './topology.js';
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
initEditor(canvas);
trains.forEach(t => t.computeCarPositions());
renderScheduleUI();

let lastTimestamp = performance.now();
let uiUpdateAccumulator = 0;
let currentSimTime = 8 * 3600;

function loop(now) {
  const realDt = Math.min(0.05, (now - lastTimestamp) / 1000);
  lastTimestamp = now;

  const panSpeed = 900 / camera.zoom;
  if (keysPressed['KeyW'] || keysPressed['ArrowUp'])    { camera.targetY -= panSpeed * realDt; camera.followTrainId = null; }
  if (keysPressed['KeyS'] || keysPressed['ArrowDown'])  { camera.targetY += panSpeed * realDt; camera.followTrainId = null; }
  if (keysPressed['KeyA'] || keysPressed['ArrowLeft'])  { camera.targetX -= panSpeed * realDt; camera.followTrainId = null; }
  if (keysPressed['KeyD'] || keysPressed['ArrowRight']) { camera.targetX += panSpeed * realDt; camera.followTrainId = null; }

  const simDt = realDt * simSpeed;
  if (simDt > 0) {
    currentSimTime += simDt;
    setSimTime(currentSimTime);
    const subSteps = simSpeed > 2 ? 4 : 1;
    const subDt = simDt / subSteps;
    for (let s = 0; s < subSteps; s++) {
      for (const tr of trains) {
        tr.update(subDt, currentSimTime, trains, true);
      }
    }
  }

  if (camera.followTrainId) {
    const followed = trains.find(t => t.id === camera.followTrainId);
    if (followed) {
      camera.targetX = followed.headPos.x;
      camera.targetY = followed.headPos.y;
    }
  }

  camera.targetX = Math.max(0, Math.min(WORLD_W, camera.targetX));
  camera.targetY = Math.max(0, Math.min(WORLD_H, camera.targetY));
  camera.x += (camera.targetX - camera.x) * Math.min(1, realDt * 10);
  camera.y += (camera.targetY - camera.y) * Math.min(1, realDt * 10);
  camera.zoom += (camera.targetZoom - camera.zoom) * Math.min(1, realDt * 12);

  document.getElementById('zoomReadout').textContent = `${Math.round(camera.zoom * 100)}%`;
  document.getElementById('simClock').textContent = formatTime(currentSimTime);

  drawWorld();
  drawMinimap();
import { initEditor, drawEditorOverlay } from './editor.js';
import { drawTracks } from './topology.js';






  uiUpdateAccumulator += realDt;
  if (uiUpdateAccumulator >= 0.25) {
    uiUpdateAccumulator = 0;
    renderScheduleUI();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
