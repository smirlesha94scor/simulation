// script.js — Уточненная бинаризация для сохранения тонких линий и текста

logSys("🔌 script.js подключен. Запуск точного фильтра текста и линий.");

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

    logSys("🎨 Тонкая обработка текста и проводников...");

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

    // Снижаем коэффициент до 0.80, чтобы черными становились только по-настоящему 
    // темные центральные пиксели линий, а не их размытые края
    let threshold = avgLuma * 0.80;

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        let val = lumaArray[p] < threshold ? 0 : 255;

        data[i]     = val; 
        data[i + 1] = val; 
        data[i + 2] = val; 
    }

    ctx.putImageData(imgData, 0, 0);

    originalImageSnapshot = ctx.getImageData(0, 0, width, height);
    cleanedImageSnapshot = ctx.getImageData(0, 0, width, height);

    logSys(`✅ Обработка завершена. Текст должен стать тоньше.`);
}
