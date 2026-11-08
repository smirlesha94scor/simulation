// script.js — Контурная подсветка проводников и радиодеталей (резисторы и корпуса внутри пустые)

logSys("🔌 script.js подключен. Контурный режим подсветки активен.");

let rawImageSnapshot = null;
let isScanningAnim = false;
let scanDebounceTimer = null;

function resetRawSnapshot() {
    rawImageSnapshot = null;
}

function onThresholdInput(val) {
    const valSpan = document.getElementById('thresholdVal');
    if (valSpan) valSpan.textContent = val;

    convertToBlackAndWhite();

    clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(() => {
        if (typeof runCircuitScan === 'function') runCircuitScan();
    }, 300);
}

function onMinLengthInput(val) {
    const valSpan = document.getElementById('minLengthVal');
    if (valSpan) valSpan.textContent = val;

    clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(() => {
        if (typeof runCircuitScan === 'function') runCircuitScan();
    }, 200);
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

function runCircuitScan() {
    const canvas = document.getElementById('cv-canvas');
    if (!canvas || !originalImageSnapshot || isScanningAnim) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    isScanningAnim = true;

    const baseSnapshot = ctx.getImageData(0, 0, width, height);
    const cleanData = cleanedImageSnapshot.data;

    const minLenInput = document.getElementById('minLengthRange');
    const MIN_LINE_LENGTH = minLenInput ? parseInt(minLenInput.value) : 35;

    // Массив для сбора пикселей проводников и внешних контуров деталей
    let highlightPixels = new Uint8Array(width * height);

    // 1. Поиск длинных линий
    for (let x = 2; x < width - 2; x++) {
        let inLine = false;
        let sY = 0;
        for (let y = 0; y < height; y++) {
            let idx = (y * width + x) * 4;
            let isBlack = (cleanData[idx] === 0 || cleanData[(y * width + (x - 1)) * 4] === 0 || cleanData[(y * width + (x + 1)) * 4] === 0);
            if (isBlack) {
                if (!inLine) { inLine = true; sY = y; }
            } else {
                if (inLine) {
                    let len = y - sY;
                    if (len >= MIN_LINE_LENGTH) {
                        for (let py = sY; py < y; py++) highlightPixels[py * width + x] = 1;
                    }
                    inLine = false;
                }
            }
        }
        if (inLine && (height - sY) >= MIN_LINE_LENGTH) {
            for (let py = sY; py < height; py++) highlightPixels[py * width + x] = 1;
        }
    }

    for (let y = 2; y < height - 2; y++) {
        let inLine = false;
        let sX = 0;
        for (let x = 0; x < width; x++) {
            let idx = (y * width + x) * 4;
            let isBlack = (cleanData[idx] === 0 || cleanData[((y - 1) * width + x) * 4] === 0 || cleanData[((y + 1) * width + x) * 4] === 0);
            if (isBlack) {
                if (!inLine) { inLine = true; sX = x; }
            } else {
                if (inLine) {
                    let len = x - sX;
                    if (len >= MIN_LINE_LENGTH) {
                        for (let px = sX; px < x; px++) highlightPixels[y * width + px] = 1;
                    }
                    inLine = false;
                }
            }
        }
        if (inLine && (width - sX) >= MIN_LINE_LENGTH) {
            for (let px = sX; px < width; px++) highlightPixels[y * width + px] = 1;
        }
    }

    // 2. Захват связанных элементов (резисторы, круги транзисторов, диагонали)
    let expandedPixels = new Uint8Array(highlightPixels);
    let queue = [];

    for (let i = 0; i < width * height; i++) {
        if (highlightPixels[i] === 1) queue.push(i);
    }

    let distMap = new Int16Array(width * height).fill(-1);
    queue.forEach(idx => distMap[idx] = 0);

    let head = 0;
    const MAX_DIST = 10;

    while (head < queue.length) {
        let curr = queue[head++];
        let currDist = distMap[curr];

        if (currDist >= MAX_DIST) continue;

        let cx = curr % width;
        let cy = Math.floor(curr / width);

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                let nx = cx + dx;
                let ny = cy + dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    let nIdx = ny * width + nx;
                    let imgIdx = nIdx * 4;

                    if (cleanData[imgIdx] === 0 && distMap[nIdx] === -1) {
                        distMap[nIdx] = currDist + 1;
                        expandedPixels[nIdx] = 1;
                        queue.push(nIdx);
                    }
                }
            }
        }
    }

    // 3. ПРЕОБРАЗОВАНИЕ В КОНТУР (оставляем только внешнюю границу, чтобы внутри резисторы и круги были пустыми)
    let contourPixels = new Uint8Array(width * height);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pIdx = y * width + x;
            if (expandedPixels[pIdx] === 1) {
                // Проверяем, есть ли белые соседи (если есть — это пиксель на границе контура)
                let isEdge = false;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        let nx = x + dx;
                        let ny = y + dy;
                        if (cleanData[(ny * width + nx) * 4] !== 0) {
                            isEdge = true;
                        }
                    }
                }
                // Также сохраняем тонкие линии в 1px, у которых нет толстой внутренней заливки
                if (isEdge || expandedPixels[(y-1)*width + x] === 0 || expandedPixels[(y+1)*width + x] === 0 || 
                    expandedPixels[y*width + (x-1)] === 0 || expandedPixels[y*width + (x+1)] === 0) {
                    contourPixels[pIdx] = 1;
                }
            }
        }
    }

    // Формируем целевой кадр
    const targetImgData = ctx.createImageData(width, height);
    const targetData = targetImgData.data;

    for (let i = 0; i < targetData.length; i += 4) {
        targetData[i] = baseSnapshot.data[i];     
        targetData[i+1] = baseSnapshot.data[i+1];   
        targetData[i+2] = baseSnapshot.data[i+2];   
        targetData[i+3] = 255;
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let pIdx = y * width + x;
            let i = pIdx * 4;
            if (cleanData[i] === 0 && contourPixels[pIdx] === 1) {
                targetData[i] = 0;       // R
                targetData[i+1] = 120;   // G (Контурная подсветка)
                targetData[i+2] = 220;   // B
            }
        }
    }

    const targetSnapshot = new ImageData(targetData, width, height);

    // 4. Попиксельный сканирующий луч (1 пиксель = 500 мс)
    let currentX = 0;
    let currentY = 0;
    let phase = 1;

    function stepRealtimeScan() {
        const currentFrameData = ctx.createImageData(width, height);
        for (let k = 0; k < currentFrameData.data.length; k += 4) {
            currentFrameData.data[k] = baseSnapshot.data[k];
            currentFrameData.data[k+1] = baseSnapshot.data[k+1];
            currentFrameData.data[k+2] = baseSnapshot.data[k+2];
            currentFrameData.data[k+3] = 255;
        }

        if (phase === 1) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x <= currentX; x++) {
                    let pIdx = y * width + x;
                    let i = pIdx * 4;
                    if (targetSnapshot.data[i] === 0 && targetSnapshot.data[i+1] === 120) {
                        currentFrameData.data[i] = targetSnapshot.data[i];
                        currentFrameData.data[i+1] = targetSnapshot.data[i+1];
                        currentFrameData.data[i+2] = targetSnapshot.data[i+2];
                    }
                }
            }

            for (let y = 0; y < height; y++) {
                let i = (y * width + currentX) * 4;
                currentFrameData.data[i] = 255;   
                currentFrameData.data[i+1] = 50;
                currentFrameData.data[i+2] = 50;
            }

            ctx.putImageData(currentFrameData, 0, 0);
            logSys(`🔴 [Сканирование X] Позиция: ${currentX}px`);

            currentX++;
            if (currentX < width) {
                setTimeout(stepRealtimeScan, 500);
            } else {
                phase = 2;
                setTimeout(stepRealtimeScan, 500);
            }
        } 
        else if (phase === 2) {
            for (let y = 0; y <= currentY; y++) {
                for (let x = 0; x < width; x++) {
                    let pIdx = y * width + x;
                    let i = pIdx * 4;
                    if (targetSnapshot.data[i] === 0 && targetSnapshot.data[i+1] === 120) {
                        currentFrameData.data[i] = targetSnapshot.data[i];
                        currentFrameData.data[i+1] = targetSnapshot.data[i+1];
                        currentFrameData.data[i+2] = targetSnapshot.data[i+2];
                    }
                }
            }

            for (let x = 0; x < width; x++) {
                let i = (currentY * width + x) * 4;
                currentFrameData.data[i] = 255;
                currentFrameData.data[i+1] = 50;
                currentFrameData.data[i+2] = 50;
            }

            ctx.putImageData(currentFrameData, 0, 0);
            logSys(`🔴 [Сканирование Y] Позиция: ${currentY}px`);

            currentY++;
            if (currentY < height) {
                setTimeout(stepRealtimeScan, 500);
            } else {
                ctx.putImageData(targetSnapshot, 0, 0);
                isScanningAnim = false;
                logSys(`✅ Завершено: резисторы и транзисторы подсвечены по контуру (внутри пустые).`);
            }
        }
    }

    stepRealtimeScan();
}
