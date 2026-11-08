// script.js — Модуль обработки (превращение в Ч/Б)

logSys("🔌 script.js подключен. Ожидание картинки для перевода в Ч/Б.");

/**
 * Функция перевода загруженного изображения в строгий черно-белый формат
 */
function convertToBlackAndWhite() {
    const canvas = document.getElementById('cv-canvas');
    if (!canvas || !originalImageSnapshot) {
        logSys("❌ Ошибка: нет данных холста для перевода в Ч/Б.");
        return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Получаем текущие пиксели холста
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    logSys("🎨 Преобразование изображения в черно-белое...");

    // Проходим по каждому пикселю (шаг 4: R, G, B, Alpha)
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Вычисляем яркость (метод шкалы серого)
        let avg = (r + g + b) / 3;

        // Порог бинаризации: темные линии делаем черными (0), фон — белым (255)
        let threshold = 128; 
        let val = avg < threshold ? 0 : 255;

        data[i]     = val; // Red
        data[i + 1] = val; // Green
        data[i + 2] = val; // Blue
    }

    // Возвращаем обработанные данные обратно на холст
    ctx.putImageData(imgData, 0, 0);

    // Обновляем снимки памяти
    originalImageSnapshot = ctx.getImageData(0, 0, width, height);
    cleanedImageSnapshot = ctx.getImageData(0, 0, width, height);

    logSys("✅ Изображение успешно переведено в черно-белый формат!");
}
