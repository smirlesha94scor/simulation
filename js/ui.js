import { camera, simSpeed, setSimSpeed, autoSwitchMode, toggleAutoSwitch } from './constants.js';
import { trains } from './train.js';
import { segmentMap } from './topology.js';

document.querySelectorAll('.speed-controls .btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.speed-controls .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setSimSpeed(Number(btn.dataset.speed));
  });
});

const autoSwitchBtn = document.getElementById('toggleAutoSwitchBtn');
autoSwitchBtn.addEventListener('click', () => {
  const active = toggleAutoSwitch();
  autoSwitchBtn.textContent = active ? 'Стрелки: АВТО' : 'Стрелки: РУЧН.';
  autoSwitchBtn.style.borderColor = active ? 'rgba(255,255,255,0.12)' : '#d29922';
});

document.getElementById('zoomInBtn').addEventListener('click', () => {
  camera.targetZoom = Math.min(camera.maxZoom, camera.targetZoom * 1.25);
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
  camera.targetZoom = Math.max(camera.minZoom, camera.targetZoom / 1.25);
});
document.getElementById('resetCamBtn').addEventListener('click', () => {
  camera.followTrainId = null;
  camera.targetX = 2200;
  camera.targetY = 1500;
  camera.targetZoom = 0.34;
  updateFollowUI();
});

const followStatusEl = document.getElementById('followStatus');
followStatusEl.addEventListener('click', () => {
  camera.followTrainId = null;
  updateFollowUI();
});

export function updateFollowUI() {
  if (camera.followTrainId) {
    const tr = trains.find(t => t.id === camera.followTrainId);
    followStatusEl.textContent = `Слежение: ${tr.number} (сброс)`;
  } else {
    followStatusEl.textContent = 'Обзор: свободный';
  }
}

window.selectTrain = function(id) {
  camera.followTrainId = id;
  camera.targetZoom = Math.max(camera.targetZoom, 0.85);
  updateFollowUI();
};

export function formatTime(sec) {
  const total = Math.floor(sec) % 86400;
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

const trainListEl = document.getElementById('trainList');
export function renderScheduleUI() {
  trainListEl.innerHTML = trains.map(tr => {
    let badgeClass = '';
    let statusText = 'В пути';
    if (tr.state === 'BOARDING') {
      badgeClass = 'boarding';
      statusText = `Стоянка (${Math.ceil(tr.dwellTimer)}с)`;
    } else if (tr.state === 'WAITING_SIGNAL') {
      badgeClass = 'waiting';
      statusText = 'Красный сигнал';
    } else if (tr.state === 'WAITING_SWITCH') {
      badgeClass = 'waiting';
      statusText = 'Стрелка закрыта';
    }

    const kmh = Math.round(tr.speed * 0.85);
    const isSel = camera.followTrainId === tr.id ? 'selected' : '';

    return `
      <div class="train-card ${isSel}" style="border-left-color:${tr.color}" onclick="selectTrain('${tr.id}')">
        <div class="train-card-top">
          <span class="train-title">${tr.number}</span>
          <span class="train-badge ${badgeClass}">${statusText}</span>
        </div>
        <div class="train-route">
          <span>След. ст.: <b>${tr.nextStationName}</b></span>
          <span>${kmh} км/ч</span>
        </div>
        <div class="train-meta">
          <span>Участок: ${segmentMap[tr.segId].name}</span>
          <span>Отпр: ${formatTime(tr.nextDepartureSec)}</span>
        </div>
      </div>
    `;
  }).join('');
}