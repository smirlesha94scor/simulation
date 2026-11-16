import { segmentMap, stationMap, switches, autoSwitchMode } from './topology.js';

export class Train {
  constructor(cfg) {
    this.id = cfg.id;
    this.number = cfg.number;
    this.name = cfg.name;
    this.color = cfg.color;
    this.carsCount = cfg.carsCount;
    this.maxCruiseSpeed = cfg.maxCruiseSpeed;
    this.route = cfg.route;
    this.stepIndex = 0;

    const firstStep = this.route[0];
    this.segId = firstStep.segId;
    this.dir = firstStep.dir;
    this.distOnSeg = firstStep.startDist || 120;

    this.speed = 0;
    this.state = 'RUNNING';
    this.dwellTimer = 0;
    this.nextDepartureSec = firstStep.depTimeSec || 0;
    this.headPos = { x: 0, y: 0, angle: 0 };
    this.carTransforms = [];
  }

  get currentStep() {
    return this.route[this.stepIndex];
  }

  get nextStationName() {
    for (let i = 0; i < this.route.length; i++) {
      const idx = (this.stepIndex + i) % this.route.length;
      if (this.route[idx].stopStationId) {
        return stationMap[this.route[idx].stopStationId].name;
      }
    }
    return 'Депо';
  }

  update(dt, simTimeSec, allTrains, isAutoSwitch) {
    const seg = segmentMap[this.segId];
    const step = this.currentStep;

    if (this.state === 'BOARDING') {
      this.speed = 0;
      this.dwellTimer -= dt;
      if (this.dwellTimer <= 0 && simTimeSec >= this.nextDepartureSec) {
        this.state = 'RUNNING';
        this.stationServed = true;
      } else {
        this.computeCarPositions();
        return;
      }
    }

    let targetSpeed = Math.min(this.maxCruiseSpeed, seg.maxSpeed);

    if (step.stopStationId && !this.stationServed) {
      const st = stationMap[step.stopStationId];
      const stopPos = this.dir === 1 ? st.targetDist : (seg.length - st.targetDist);
      const distToStop = stopPos - this.distOnSeg;

      if (distToStop <= 3 && distToStop >= -25) {
        this.distOnSeg = stopPos;
        this.speed = 0;
        this.state = 'BOARDING';
        this.dwellTimer = step.dwellSec || 8;
        this.nextDepartureSec = Math.ceil((simTimeSec + this.dwellTimer) / 15) * 15;
        this.computeCarPositions();
        return;
      } else if (distToStop > 0 && distToStop < 260) {
        targetSpeed = Math.min(targetSpeed, Math.max(18, distToStop * 0.55));
      }
    }

    let blockedByTrain = false;
    const totalTrainLen = 46 + this.carsCount * 38;
    for (const other of allTrains) {
      if (other.id === this.id) continue;
      if (other.segId === this.segId && other.dir === this.dir) {
        const gap = other.distOnSeg - this.distOnSeg;
        if (gap > 0 && gap < totalTrainLen + 140) {
          blockedByTrain = true;
          if (gap < totalTrainLen + 55) targetSpeed = 0;
          else targetSpeed = Math.min(targetSpeed, other.speed * 0.8);
        }
      }
    }

    const remDist = seg.length - this.distOnSeg;
    const nextStepIdx = (this.stepIndex + 1) % this.route.length;
    const nextStep = this.route[nextStepIdx];

    if (remDist < 220) {
      const exitNodeId = this.dir === 1 ? seg.toNode.id : seg.fromNode.id;
      const sw = switches.find(s => s.nodeId === exitNodeId);

      if (sw && sw.branches.includes(nextStep.segId)) {
        const activeBranch = sw.branches[sw.activeIndex];
        if (activeBranch !== nextStep.segId) {
          if (isAutoSwitch && remDist < 170) {
            sw.activeIndex = sw.branches.indexOf(nextStep.segId);
          } else {
            targetSpeed = remDist < 42 ? 0 : Math.min(targetSpeed, remDist * 0.45);
            if (remDist < 45) this.state = 'WAITING_SWITCH';
          }
        }
      }

      const nextSeg = segmentMap[nextStep.segId];
      for (const other of allTrains) {
        if (other.id === this.id) continue;
        if (other.segId === nextStep.segId) {
          const otherDistFromEntry = other.dir === nextStep.dir ? other.distOnSeg : (nextSeg.length - other.distOnSeg);
          if (otherDistFromEntry < 240) {
            targetSpeed = remDist < 45 ? 0 : Math.min(targetSpeed, remDist * 0.45);
            if (remDist < 48) this.state = 'WAITING_SIGNAL';
          }
        }
      }
    }

    if (targetSpeed > 0 && !blockedByTrain) {
      this.state = 'RUNNING';
    } else if (blockedByTrain && targetSpeed === 0) {
      this.state = 'WAITING_SIGNAL';
    }

    const accel = 48;
    const brake = 75;
    if (this.speed < targetSpeed) {
      this.speed = Math.min(targetSpeed, this.speed + accel * dt);
    } else if (this.speed > targetSpeed) {
      this.speed = Math.max(targetSpeed, this.speed - brake * dt);
    }

    this.distOnSeg += this.speed * dt;

    if (this.distOnSeg >= seg.length) {
      const overflow = this.distOnSeg - seg.length;
      this.stepIndex = nextStepIdx;
      this.segId = nextStep.segId;
      this.dir = nextStep.dir;
      this.distOnSeg = overflow;
      this.stationServed = false;
    }

    this.computeCarPositions();
  }

  computeCarPositions() {
    this.carTransforms = [];
    const totalUnits = 1 + this.carsCount;
    const unitSpacing = 38;

    for (let u = 0; u < totalUnits; u++) {
      const offsetBack = u * unitSpacing;
      const pt = this.sampleBackwards(offsetBack);
      this.carTransforms.push(pt);
    }
    this.headPos = this.carTransforms[0];
  }

  sampleBackwards(backDist) {
    let rem = backDist;
    let idx = this.stepIndex;
    let sId = this.segId;
    let d = this.dir;
    let pos = this.distOnSeg;

    for (let guard = 0; guard < 6; guard++) {
      if (pos >= rem) {
        return segmentMap[sId].getPointAt(pos - rem, d);
      }
      rem -= pos;
      idx = (idx - 1 + this.route.length) % this.route.length;
      const prevStep = this.route[idx];
      sId = prevStep.segId;
      d = prevStep.dir;
      pos = segmentMap[sId].length;
    }
    if (!seg) return { x: 0, y: 0, angle: 0 };
    return segmentMap[sId].getPointAt(0, d);
  }
}

export const trains = [
  new Train({
    id: 'T1', number: '№ 101 «Экспресс»', name: 'Северное кольцо', color: '#388bfd', carsCount: 4, maxCruiseSpeed: 135,
    route: [
      { segId: 'S1',  dir: 1, startDist: 450, stopStationId: 'ST_CENT', dwellSec: 7 },
      { segId: 'S2',  dir: 1 }, { segId: 'S3',  dir: 1, stopStationId: 'ST_NORT', dwellSec: 7 },
      { segId: 'S4',  dir: 1, stopStationId: 'ST_PASS', dwellSec: 7 }, { segId: 'S5',  dir: 1 },
      { segId: 'S8',  dir: 1, stopStationId: 'ST_SOUT', dwellSec: 7 }, { segId: 'S9',  dir: 1 },
      { segId: 'S10', dir: 1, stopStationId: 'ST_VALL', dwellSec: 6 }
    ]
  }),
  new Train({
    id: 'T2', number: '№ 204 «Индустрия»', name: 'Заводской маршрут', color: '#f85149', carsCount: 5, maxCruiseSpeed: 115,
    route: [
      { segId: 'S7',  dir: 1, startDist: 200, stopStationId: 'ST_FACT', dwellSec: 8 },
      { segId: 'S8',  dir: 1, stopStationId: 'ST_SOUT', dwellSec: 7 }, { segId: 'S9',  dir: 1 },
      { segId: 'S10', dir: 1, stopStationId: 'ST_VALL', dwellSec: 6 }, { segId: 'S2',  dir: 1 }, { segId: 'S6',  dir: 1 }
    ]
  }),
  new Train({
    id: 'T3', number: '№ 312 «Горный»', name: 'Альпийский экспресс', color: '#d29922', carsCount: 3, maxCruiseSpeed: 125,
    route: [
      { segId: 'S4',  dir: 1, startDist: 300, stopStationId: 'ST_PASS', dwellSec: 8 }, { segId: 'S5',  dir: 1 },
      { segId: 'S7',  dir: -1, stopStationId: 'ST_FACT', dwellSec: 7 }, { segId: 'S6',  dir: -1 },
      { segId: 'S3',  dir: 1, stopStationId: 'ST_NORT', dwellSec: 7 }
    ]
  }),
  new Train({
    id: 'T4', number: '№ 408 «Пригород»', name: 'Южный челнок', color: '#3fb950', carsCount: 3, maxCruiseSpeed: 120,
    route: [
      { segId: 'S10', dir: 1, startDist: 400 }, { segId: 'S2',  dir: 1 }, { segId: 'S6',  dir: 1 },
      { segId: 'S7',  dir: 1, stopStationId: 'ST_FACT', dwellSec: 6 }, { segId: 'S8',  dir: 1, stopStationId: 'ST_SOUT', dwellSec: 7 },
      { segId: 'S9',  dir: 1 }
    ]
  })
];
