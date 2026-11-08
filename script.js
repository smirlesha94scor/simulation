// script.js — Универсальный фильтр перевода в Ч/Б для любого изображения

logSys("🔌 script.js подключен. Запуск универсального алгоритма бинаризации.");

function convertToBlackAndWhite() {
    const canvas = document.getElementById('cv-canvas');
    if (!canvas || !originalImageSnapshot) {
        logSys("❌ Ошибка: нет данных холста.");
        return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    logSys("🎨 Анализ и универсальная адаптивная обработка...");

    // Массив для хранения яркости каждого пикселя
    const lumaArray = new Float32Array(width * height);
    let sumLuma = 0;

    // Шаг 1: Переводим в шкалу серого (Luma) и считаем общую среднюю яркость
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Стандартная формула восприятия яркости человеческим глазом
        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        lumaArray[p] = luma;
        sumLuma += luma;
    }

    let avgLuma = sumLuma / lumaArray.length;

    // Шаг 2: Умная бинаризация
    // Всё, что темнее среднего уровня (с небольшим коэффициентом для чистоты линий), становится черным.
    // Всё, что светлее — становится белым фоном.
    let threshold = avgLuma * 0.92;

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        let val = lumaArray[p] < threshold ? 0 : 255;

        data[i]     = val; // Red
        data[i + 1] = val; // Green
        data[i + 2] = val; // Blue
    }

    ctx.putImageData(imgData, 0, 0);

    // Сохраняем снимки в памяти для дальнейшего сканирования
    originalImageSnapshot = ctx.getImageData(0, 0, width, height);
    cleanedImageSnapshot = ctx.getImageData(0, 0, width, height);

    logSys(`✅ Универсальная обработка завершена (Средний порог: ${Math.round(threshold)}).`);
}
