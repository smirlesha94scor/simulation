// script.js — Сканирование и подсветка только длинных линий (текст игнорируется)

logSys("🔌 script.js подключен. Фильтр длинных линий активен.");

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

// Сканирование с фильтром по минимальной длине (игнорирование текста)
function runCircuitScan() {
    const canvas = document.getElementById('cv-canvas');
    if (!canvas || !originalImageSnapshot) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Восстанавливаем чистую Ч/Б картинку перед отрисовкой новых линий
    ctx.putImageData(cleanedImageSnapshot, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let longVerticalLines = 0;
    let longHorizontalLines = 0;

    // МИНКИМАЛЬНАЯ ДЛИНА ЛИНИИ В ПИКСЕЛЯХ (все, что короче — текст/символы, игнорируется)
    const MIN_LINE_LENGTH = 45; 

    ctx.lineWidth = 2; // Делаем линии подсветки чуть заметнее

    // 1. Поиск длинных вертикальных линий (синие)
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
                    if (segmentPixelCount >= MIN_LINE_LENGTH) {
                        longVerticalLines++;
                        ctx.strokeStyle = 'rgba(0, 120, 255, 0.8)';
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
        if (inLineSegment && segmentPixelCount >= MIN_LINE_LENGTH) {
            longVerticalLines++;
            ctx.strokeStyle = 'rgba(0, 120, 255, 0.8)';
            ctx.beginPath();
            ctx.moveTo(x, segmentStartY);
            ctx.lineTo(x, height - 1);
            ctx.stroke();
        }
    }

    // 2. Поиск длинных горизонтальных линий (зеленые)
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
                    if (segmentPixelCount >= MIN_LINE_LENGTH) {
                        longHorizontalLines++;
                        ctx.strokeStyle = 'rgba(0, 220, 100, 0.8)';
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
        if (inLineSegment && segmentPixelCount >= MIN_LINE_LENGTH) {
            longHorizontalLines++;
            ctx.strokeStyle = 'rgba(0, 220, 100, 0.8)';
            ctx.beginPath();
            ctx.moveTo(segmentStartX, y);
            ctx.lineTo(width - 1, y);
            ctx.stroke();
        }
    }

    const rangeInput = document.getElementById('thresholdRange');
    const currentVal = rangeInput ? rangeInput.value : '0.68';
    
    logSys(`🎯 [Только длинные линии] Порог: ${currentVal} ➔ Вертикалей: ${longVerticalLines}, Горизонталей: ${longHorizontalLines}`);
}
