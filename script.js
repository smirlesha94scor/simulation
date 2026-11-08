// script.js — Динамическое сканирование с поддержкой двух ползунков управления

logSys("🔌 script.js подключен. Панель ползунков активна.");

let rawImageSnapshot = null;
let isScanningAnim = false;
let scanDebounceTimer = null;

function resetRawSnapshot() {
    rawImageSnapshot = null;
}

// Обработка ползунка порога
function onThresholdInput(val) {
    const valSpan = document.getElementById('thresholdVal');
    if (valSpan) valSpan.textContent = val;

    convertToBlackAndWhite();

    clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(() => {
        if (typeof runCircuitScan === 'function') runCircuitScan();
    }, 300);
}

// Обработка нового ползунка минимальной длины
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

// Главная функция сканирования и попиксельной подсветки длинных линий
function runCircuitScan() {
    const canvas = document.getElementById('cv-canvas');
    if (!canvas || !originalImageSnapshot || isScanningAnim) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    isScanningAnim = true;

    const outputImgData = ctx.createImageData(width, height);
    const outData = outputImgData.data;
    
    for (let i = 0; i < outData.length; i += 4) {
        outData[i] = 255;     
        outData[i+1] = 255;   
        outData[i+2] = 255;   
        outData[i+3] = 255;   
    }

    const cleanData = cleanedImageSnapshot.data;

    // Считываем значение минимальной длины прямо с нового ползунка
    const minLenInput = document.getElementById('minLengthRange');
    const MIN_LINE_LENGTH = minLenInput ? parseInt(minLenInput.value) : 35;

    // 1. Поиск длинных вертикальных пикселей
    let validVerticalPixels = new Uint8Array(width * height);
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
                        for (let py = sY; py < y; py++) {
                            validVerticalPixels[py * width + x] = 1;
                        }
                    }
                    inLine = false;
                }
            }
        }
        if (inLine && (height - sY) >= MIN_LINE_LENGTH) {
            for (let py = sY; py < height; py++) {
                validVerticalPixels[py * width + x] = 1;
            }
        }
    }

    // 2. Поиск длинных горизонтальных пикселей
    let validHorizontalPixels = new Uint8Array(width * height);
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
                        for (let px = sX; px < x; px++) {
                            validHorizontalPixels[y * width + px] = 1;
                        }
                    }
                    inLine = false;
                }
            }
        }
        if (inLine && (width - sX) >= MIN_LINE_LENGTH) {
            for (let px = sX; px < width; px++) {
                validHorizontalPixels[y * width + px] = 1;
            }
        }
    }

    // 3. Окрашивание
    let vertCount = 0;
    let horizCount = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let pIdx = y * width + x;
            let i = pIdx * 4;

            let isVert = validVerticalPixels[pIdx] === 1;
            let isHoriz = validHorizontalPixels[pIdx] === 1;

            if (isVert || isHoriz) {
                outData[i] = 0;       // R
                outData[i+1] = 120;   // G
                outData[i+2] = 220;   // B
                outData[i+3] = 255;   // A

                if (isVert) vertCount++;
                if (isHoriz) horizCount++;
            }
        }
    }

    ctx.putImageData(outputImgData, 0, 0);
    const scannedSnapshot = ctx.getImageData(0, 0, width, height);

    // 4. Анимация сканирующих лучей
    let startTime = performance.now();
    const duration = 600;

    function animateScanBeams(currentTime) {
        let elapsed = currentTime - startTime;
        let progress = Math.min(elapsed / duration, 1.0);

        ctx.putImageData(scannedSnapshot, 0, 0);

        if (progress <= 0.5) {
            let currentX = Math.floor((progress * 2) * width);
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(currentX, 0);
            ctx.lineTo(currentX, height);
            ctx.stroke();
        } else {
            let currentY = Math.floor(((progress - 0.5) * 2) * height);
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, currentY);
            ctx.lineTo(width, currentY);
            ctx.stroke();
        }

        if (progress < 1.0) {
            requestAnimationFrame(animateScanBeams);
        } else {
            ctx.putImageData(scannedSnapshot, 0, 0);
            isScanningAnim = false;
        }
    }

    requestAnimationFrame(animateScanBeams);

    const thresholdVal = document.getElementById('thresholdRange').value;
    logSys(`🎚️ [Порог: ${thresholdVal} | Мин. длина: ${MIN_LINE_LENGTH}px] ➔ Пикселей: верт. ${vertCount}, гориз. ${horizCount}`);
}
