// script.js — Обработка изображений с учетом их реального исходного размера

logSys("🔌 script.js подключен. Поддержка оригинальных размеров активна.");

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

// Модуль сканирования с учетом реальных размеров матрицы
function runCircuitScan() {
    const canvas = document.getElementById('cv-canvas');
    if (!canvas || !originalImageSnapshot) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let verticalConductors = 0;
    let horizontalConductors = 0;

    for (let x = 0; x < width; x++) {
        let darkPixelsInCol = 0;
        for (let y = 0; y < height; y++) {
            let idx = (y * width + x) * 4;
            if (data[idx] === 0) darkPixelsInCol++;
        }
        if (darkPixelsInCol > 10) verticalConductors++;
    }

    for (let y = 0; y < height; y++) {
        let darkPixelsInRow = 0;
        for (let x = 0; x < width; x++) {
            let idx = (y * width + x) * 4;
            if (data[idx] === 0) darkPixelsInRow++;
        }
        if (darkPixelsInRow > 10) horizontalConductors++;
    }

    const rangeInput = document.getElementById('thresholdRange');
    const currentVal = rangeInput ? rangeInput.value : '0.68';
    logSys(`🎚️ Порог [${currentVal}]: найдено вертикалей ~${Math.round(verticalConductors/3)}, горизонталей ~${Math.round(horizontalConductors/3)}`);
}
