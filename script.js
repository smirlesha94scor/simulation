// script.js — Сканирование с визуальной подсветкой вертикалей и горизонталей на холсте

logSys("🔌 script.js подключен. Модуль визуализации линий активен.");

let rawImageSnapshot = null;
let scanDebounceTimer = null;

function resetRawSnapshot() {
    rawImageSnapshot = null;
}

function onThresholdInput(val) {
    const valSpan = document.getElementById('thresholdVal');
    if (valSpan) valSpan.textContent = val;

    if (!rawImageSnapshot && originalImageSnapshot) {
        convertToBlackAndWhite();
        return;
    }

    convertToBlackAndWhite();

    clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(() => {
        if (typeof runCircuitScan === 'function') {
            runCircuitScan();
        }
    }, 300);
}

function convertToBlackAndWhite() {
    const canvas = document.getElementById('cv-canvas');
    if (!canvas || !originalImageSnapshot) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    if (!rawImageSnapshot) {
        rawImageSnapshot = ctx.getImageData(0, 0, width, height);
    }

    const imgData = new ImageData(
        new Uint8ClampedArray(rawImageSnapshot.data),
        rawImageSnapshot.width,
        rawImageSnapshot.height
    );
    const data = imgData.data;

    const rangeInput = document.getElementById('thresholdRange');
    const multiplier = rangeInput ? parseFloat(rangeInput.value) : 0.68;

    const lumaArray = new Float32Array(width * height);
    let sumLuma = 0;

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        lumaArray[p] = luma;
        sumLuma += luma;
    }

    let avgLuma = sumLuma / lumaArray.length;
    let threshold = avgLuma * multiplier;

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        let val = lumaArray[p] < threshold ? 0 : 255;
        data[i]     = val; 
        data[i + 1] = val; 
        data[i + 2] = val; 
    }

    ctx.putImageData(imgData, 0, 0);

    originalImageSnapshot = ctx.getImageData(0, 0, width, height);
    cleanedImageSnapshot = ctx.getImageData(0, 0, width, height);
}

// Сканирование с отрисовкой линий поверх холста
function runCircuitScan() {
    const canvas = document.getElementById('cv-canvas');
    if (!canvas || !originalImageSnapshot) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Сначала восстанавливаем чистую черно-белую картинку из снимка
    ctx.putImageData(cleanedImageSnapshot, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let exactVerticalLines = 0;
    let exactHorizontalLines = 0;

    ctx.lineWidth = 1;

    // 1. Поиск и подсветка вертикальных линий (рисуем синие линии)
    for (let x = 0; x < width; x++) {
        let inLineSegment = false;
        let segmentPixelCount = 0;
        let segmentStartY = 0;

        for (let y = 0; y < height; y++) {
            let idx = (y * width + x) * 4;
            let isBlack = (data[idx] === 0);

            if (isBlack) {
                if (!inLineSegment) {
                    inLineSegment = true;
                    segmentStartY = y;
                    segmentPixelCount = 1;
                } else {
                    segmentPixelCount++;
                }
            } else {
                if (inLineSegment) {
                    if (segmentPixelCount >= 5) {
                        exactVerticalLines++;
                        // Визуальная подсветка найденного вертикального отрезка синим
                        ctx.strokeStyle = 'rgba(0, 120, 255, 0.6)';
                        ctx.beginPath();
                        ctx.moveTo(x, segmentStartY);
                        ctx.lineTo(x, y - 1);
                        ctx.stroke();
                    }
                    inLineSegment = false;
                    segmentPixelCount = 0;
                }
            }
        }
        if (inLineSegment && segmentPixelCount >= 5) {
            exactVerticalLines++;
            ctx.strokeStyle = 'rgba(0, 120, 255, 0.6)';
            ctx.beginPath();
            ctx.moveTo(x, segmentStartY);
            ctx.lineTo(x, height - 1);
            ctx.stroke();
        }
    }

    // 2. Поиск и подсветка горизонтальных линий (рисуем зеленые линии)
    for (let y = 0; y < height; y++) {
        let inLineSegment = false;
        let segmentPixelCount = 0;
        let segmentStartX = 0;

        for (let x = 0; x < width; x++) {
            let idx = (y * width + x) * 4;
            let isBlack = (data[idx] === 0);

            if (isBlack) {
                if (!inLineSegment) {
                    inLineSegment = true;
                    segmentStartX = x;
                    segmentPixelCount = 1;
                } else {
                    segmentPixelCount++;
                }
            } else {
                if (inLineSegment) {
                    if (segmentPixelCount >= 5) {
                        exactHorizontalLines++;
                        // Визуальная подсветка найденного горизонтального отрезка зеленым
                        ctx.strokeStyle = 'rgba(0, 220, 100, 0.6)';
                        ctx.beginPath();
                        ctx.moveTo(segmentStartX, y);
                        ctx.lineTo(x - 1, y);
                        ctx.stroke();
                    }
                    inLineSegment = false;
                    segmentPixelCount = 0;
                }
            }
        }
        if (inLineSegment && segmentPixelCount >= 5) {
            exactHorizontalLines++;
            ctx.strokeStyle = 'rgba(0, 220, 100, 0.6)';
            ctx.beginPath();
            ctx.moveTo(segmentStartX, y);
            ctx.lineTo(width - 1, y);
            ctx.stroke();
        }
    }

    const rangeInput = document.getElementById('thresholdRange');
    const currentVal = rangeInput ? rangeInput.value : '0.68';
    
    logSys(`🎨 [Подсветка] Порог: ${currentVal} ➔ Вертикалей: ${exactVerticalLines} (синие), Горизонталей: ${exactHorizontalLines} (зеленые)`);
}
