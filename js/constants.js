export const WORLD_W = 4400;
export const WORLD_H = 3000;

export const canvas = document.getElementById('simCanvas');
export const ctx = canvas.getContext('2d');
export const miniCanvas = document.getElementById('minimapCanvas');
export const miniCtx = miniCanvas.getContext('2d');

export function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

export const camera = {
  x: WORLD_W / 2,
  y: WORLD_H / 2,
  zoom: 0.42,
  targetX: WORLD_W / 2,
  targetY: WORLD_H / 2,
  targetZoom: 0.42,
  minZoom: 0.22,
  maxZoom: 2.2,
  followTrainId: null
};

export const keysPressed = {};
export let simSpeed = 1;
export let simTimeSec = 8 * 3600;
export let autoSwitchMode = true;

export function setSimSpeed(val) { simSpeed = val; }
export function setSimTime(val) { simTimeSec = val; }
export function toggleAutoSwitch() { autoSwitchMode = !autoSwitchMode; return autoSwitchMode; }