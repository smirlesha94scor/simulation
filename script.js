// script.js — Динамический подбор порога утончения

logSys("🔌 script.js подключен. Модуль настройки порога активен.");

let rawImageSnapshot = null; // Буфер для хранения оригинала перед Ч/Б

// Функция обновления текста рядом со слайдером
function updateThresholdValue(val) {
    const valSpan = document.getElementById('thresholdVal');
    if (valSpan) valSpan.textContent = val;
}

// Главная функция конвертации с настраиваемым коэффициентом
function convertToBlackAndWhite() {
    const canvas = document.getElementById('cv-canvas');
    if (!canvas || !originalImageSnapshot) {
        logSys("❌ Ошибка: нет данных холста.");
        return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Сохраняем чистый оригинал при первой загрузке
    if (!rawImageSnapshot) {
        rawImageSnapshot = ctx.getImageData(0, 0, width, height);
    }

    // Всегда берем данные из исходного буфера для чистоты эксперимента
    const imgData = new ImageData(
        new Uint8ClampedArray(rawImageSnapshot.data),
        rawImageSnapshot.width,
        rawImageSnapshot.height
    );
    const data = imgData.data;

    // Читаем текущее значение ползунка из интерфейса
    const rangeInput = document.getElementById('thresholdRange');
    const multiplier = rangeInput ? parseFloat(rangeInput.value) : 0.68;

    logSys(`🎨 Пересчет порогового значения (коэф: ${multiplier})...`);

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

    logSys(`✅ Готово! Порог: ${Math.round(threshold)} (коэф: ${multiplier})`);
}

// Кнопка пересчета при изменении ползунка
function reapplyThreshold() {
    if (!rawImageSnapshot) {
        logSys("⚠️ Сначала загрузите изображение.");
        return;
    }
    convertToBlackAndWhite();
}

// Сбрасываем сырой буфер при загрузке новой картинки
const originalLoad = window.loadToCanvas; // если нужно перехватить
