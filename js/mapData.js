// mapData.js — ЕДИНОЕ МЕСТО ДЛЯ ВСЕГО КОДА ПУТЕЙ
export const TRACK_DATA = {
    segments: [
        // Прямой участок (от точки start до точки end)
        {
            id: 'seg_1',
            type: 'line',
            start: { x: 100, y: 300 },
            end: { x: 450, y: 300 }
        },
        // Плавный поворот (start -> контрольная точка изгиба control -> end)
        {
            id: 'seg_2',
            type: 'curve',
            start: { x: 450, y: 300 },
            control: { x: 600, y: 300 }, // задаёт плавный радиус поворота
            end: { x: 650, y: 450 }
        },
        // Следующий прямой участок
        {
            id: 'seg_3',
            type: 'line',
            start: { x: 650, y: 450 },
            end: { x: 650, y: 700 }
        }
    ],
    stations: [
        { id: 'st_1', name: 'Центральная', segId: 'seg_1', t: 0.5 }
    ],
    switches: [
        // Стрелка связывает конец seg_1 с выбором между seg_2 (основной) и seg_alt (боковой)
        // { id: 'sw_1', fromSeg: 'seg_1', branches: ['seg_2', 'seg_alt'], activeIndex: 0 }
    ]
};
