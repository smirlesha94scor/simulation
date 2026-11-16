import { segments, segmentMap, stations, switches, autoSwitchMode } from './topology.js';

export class Train {
    constructor(config) {
        this.id = config.id;
        this.number = config.number;
        this.name = config.name || `Состав ${config.number}`;
        this.color = config.color || '#58a6ff';
        this.carCount = config.carCount || 4;
        this.carSpacing = 36;
        this.maxSpeed = config.maxSpeed || 120;

        this.currentSeg = segmentMap[config.segmentId] || segments[config.fallbackIndex ?? 0] || null;
        this.segId = this.currentSeg ? this.currentSeg.id : null;
        this.direction = config.direction || 1;
        this.dist = this.currentSeg ? Math.min(config.dist || 120, Math.max(10, this.currentSeg.length * 0.5)) : 0;
        this.speed = 0;

        this.headPos = { x: 0, y: 0, angle: 0 };
        this.carTransforms = [];
        this.pathHistory = [];

        this.schedule = this.buildSchedule(config.schedule);
        this.scheduleIndex = 0;
        this.state = 'RUNNING'; // 'RUNNING' | 'BOARDING'
        this.dwellTimer = 0;
        this.nextStationName = this.getTargetStation()?.name || 'Кольцевой маршрут';
        this.nextDepartureSec = 8 * 3600 + 300;

        this.computeCarPositions();
    }

    buildSchedule(customSchedule) {
        if (Array.isArray(customSchedule) && customSchedule.length > 0) {
            const valid = customSchedule.filter(item => stations.some(st => st.id === item.stationId));
            if (valid.length > 0) return valid;
        }
        return stations.map((st, idx) => ({
            stationId: st.id,
            station: st,
            name: st.name,
            dwellTime: 18 + (idx % 2) * 7
        }));
    }

    getTargetStation() {
        if (!Array.isArray(this.schedule) || this.schedule.length === 0) return null;
        const entry = this.schedule[this.scheduleIndex % this.schedule.length];
        return stations.find(st => st.id === entry.stationId) || null;
    }

    update(dt, simTime, allTrains, allowSwitchControl = true) {
        if (!this.currentSeg || !segmentMap[this.currentSeg.id]) {
            this.segId = null;
            this.nextStationName = 'Нет пути';
            return;
        }

        this.segId = this.currentSeg.id;

        if (this.schedule.length === 0 && stations.length > 0) {
            this.schedule = this.buildSchedule();
        }

        const targetSt = this.getTargetStation();
        this.nextStationName = targetSt ? targetSt.name : 'Следует по линии';

        // 1. Стоянка на платформе (статус BOARDING для ui.js)
        if (this.state === 'BOARDING') {
            this.speed = 0;
            this.dwellTimer -= dt;
            this.nextDepartureSec = simTime + Math.max(0, this.dwellTimer);

            if (this.dwellTimer <= 0) {
                this.state = 'RUNNING';
                this.scheduleIndex = (this.scheduleIndex + 1) % Math.max(1, this.schedule.length);
                const nextSt = this.getTargetStation();
                this.nextStationName = nextSt ? nextSt.name : 'Следует по линии';
                this.nextDepartureSec = simTime + 180;
            }
            this.computeCarPositions();
            return;
        }

        // 2. Расчёт скорости и торможения
        let targetSpeed = Math.min(this.maxSpeed, this.currentSeg.maxSpeed || 120);

        for (const other of allTrains) {
            if (other.id === this.id || !other.currentSeg) continue;
            if (other.currentSeg.id === this.currentSeg.id && other.direction === this.direction) {
                const gap = (other.dist - this.dist) * this.direction;
                const trainLen = this.carCount * this.carSpacing + 90;
                if (gap > 0 && gap < trainLen + 180) {
                    targetSpeed = Math.min(targetSpeed, Math.max(0, (gap - trainLen) * 0.65));
                }
            }
        }

        if (targetSt && (targetSt.segmentId === this.currentSeg.id || targetSt.segId === this.currentSeg.id)) {
            const slider = document.querySelector('input[type="range"]');
            const offset = slider ? Number(slider.value) || 0 : 0;
            const stopPoint = Math.max(20, Math.min(this.currentSeg.length - 20, (targetSt.targetDist ?? this.currentSeg.length * 0.5) + offset * this.direction));
            const distToStop = (stopPoint - this.dist) * this.direction;

            if (distToStop >= 0 && distToStop < 260) {
                targetSpeed = Math.min(targetSpeed, Math.max(12, distToStop * 0.55));
                if (distToStop <= 6) {
                    this.dist = stopPoint;
                    this.speed = 0;
                    this.state = 'BOARDING';
                    const entry = this.schedule[this.scheduleIndex % this.schedule.length];
                    this.dwellTimer = entry?.dwellTime || 20;
                    this.nextDepartureSec = simTime + this.dwellTimer;
                    this.computeCarPositions();
                    return;
                }
            }
        }

        const accel = targetSpeed > this.speed ? 45 : 75;
        if (this.speed < targetSpeed) {
            this.speed = Math.min(targetSpeed, this.speed + accel * dt);
        } else {
            this.speed = Math.max(targetSpeed, this.speed - accel * dt);
        }

        if (this.speed > 5) {
            this.nextDepartureSec = simTime + 120;
        }

        // 3. Перемещение вдоль сегмента
        const moveStep = this.speed * dt * this.direction;
        this.dist += moveStep;

        if (this.direction === 1 && this.dist >= this.currentSeg.length) {
            const overflow = this.dist - this.currentSeg.length;
            this.advanceToNextSegment(overflow, allowSwitchControl);
        } else if (this.direction === -1 && this.dist <= 0) {
            const overflow = -this.dist;
            this.advanceToNextSegment(overflow, allowSwitchControl);
        }

        this.computeCarPositions();
    }

    advanceToNextSegment(overflow, allowSwitchControl) {
        const endNode = this.direction === 1 ? this.currentSeg.toNode : this.currentSeg.fromNode;
        if (!endNode) {
            this.direction *= -1;
            this.dist = Math.max(0, Math.min(this.currentSeg.length, this.dist));
            return;
        }

        const sw = switches.find(s => s.nodeId === endNode.id || s.fromSeg === this.currentSeg.id);
        let nextSeg = null;

        if (sw && Array.isArray(sw.branches) && sw.branches.length > 0) {
            if (autoSwitchMode && allowSwitchControl) {
                const targetSt = this.getTargetStation();
                if (targetSt) {
                    const targetSegId = targetSt.segmentId || targetSt.segId;
                    const directIdx = sw.branches.indexOf(targetSegId);
                    if (directIdx !== -1) sw.activeIndex = directIdx;
                }
            }
            const branchId = sw.branches[sw.activeIndex % sw.branches.length];
            nextSeg = segmentMap[branchId] || null;
        }

        if (!nextSeg) {
            const connected = segments.filter(s =>
                s.id !== this.currentSeg.id &&
                (s.fromNode?.id === endNode.id || s.toNode?.id === endNode.id)
            );
            nextSeg = connected[0] || null;
        }

        if (nextSeg) {
            this.pathHistory.unshift({
                seg: this.currentSeg,
                direction: this.direction
            });
            if (this.pathHistory.length > 6) this.pathHistory.pop();

            this.currentSeg = nextSeg;
            this.segId = nextSeg.id;
            if (nextSeg.fromNode?.id === endNode.id) {
                this.direction = 1;
                this.dist = Math.min(overflow, nextSeg.length);
            } else {
                this.direction = -1;
                this.dist = Math.max(0, nextSeg.length - overflow);
            }
        } else {
            this.direction *= -1;
            this.dist = this.direction === 1
                ? Math.min(overflow, this.currentSeg.length)
                : Math.max(0, this.currentSeg.length - overflow);
        }
    }

    computeCarPositions() {
        if (!this.currentSeg || typeof this.currentSeg.getPointAt !== 'function') {
            this.headPos = { x: 0, y: 0, angle: 0 };
            this.carTransforms = [];
            return;
        }

        this.headPos = this.currentSeg.getPointAt(this.dist, this.direction);
        this.carTransforms = [];

        for (let i = 0; i < this.carCount; i++) {
            const backOffset = i * this.carSpacing;
            const pt = this.sampleBackwards(backOffset);
            this.carTransforms.push(pt);
        }
    }

    sampleBackwards(backOffset) {
        if (!this.currentSeg || typeof this.currentSeg.getPointAt !== 'function') {
            return { x: 0, y: 0, angle: 0 };
        }

        let remaining = backOffset;
        let seg = this.currentSeg;
        let dir = this.direction;
        let d = this.dist;
        let histIdx = 0;

        while (remaining > 0 && seg) {
            const available = dir === 1 ? d : (seg.length - d);
            if (remaining <= available) {
                const targetD = dir === 1 ? (d - remaining) : (d + remaining);
                return seg.getPointAt(Math.max(0, Math.min(seg.length, targetD)), dir);
            }

            remaining -= available;
            const prevEntry = this.pathHistory[histIdx++];
            if (prevEntry && prevEntry.seg && typeof prevEntry.seg.getPointAt === 'function') {
                seg = prevEntry.seg;
                dir = prevEntry.direction;
                d = dir === 1 ? seg.length : 0;
            } else {
                const edgePt = seg.getPointAt(dir === 1 ? 0 : seg.length, dir);
                return {
                    x: edgePt.x - Math.cos(edgePt.angle) * remaining,
                    y: edgePt.y - Math.sin(edgePt.angle) * remaining,
                    angle: edgePt.angle
                };
            }
        }

        return seg.getPointAt(Math.max(0, Math.min(seg.length, d)), dir);
    }
}

export const trains = segments.length > 0
    ? [
        new Train({
            id: 'TR_101',
            number: '101Э',
            name: 'Экспресс-1',
            color: '#58a6ff',
            carCount: 4,
            maxSpeed: 135,
            fallbackIndex: 0,
            dist: 140
        }),
        ...(segments.length > 1
            ? [
                new Train({
                    id: 'TR_204',
                    number: '204П',
                    name: 'Пригородный',
                    color: '#3fb950',
                    carCount: 3,
                    maxSpeed: 105,
                    fallbackIndex: Math.floor(segments.length / 2),
                    dist: 100
                })
            ]
            : [])
    ]
    : [];
