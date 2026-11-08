<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>CV Circuit Scanner — Исходный размер</title>
    <style>
        body { font-family: sans-serif; margin: 0; background: #0e0e12; color: #fff; }
        .top-toolbar {
            background: #181820;
            padding: 12px 15px;
            border-bottom: 2px solid #444;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        .container { padding: 20px; text-align: center; }
        #viewport {
            position: relative;
            display: inline-block;
            border: 2px solid #444;
            border-radius: 8px;
            overflow: hidden;
            background: #fff;
            max-width: 100%;
        }
        #cv-canvas {
            display: block;
            max-width: 100%;
            height: auto; /* Сохраняет пропорции на экране */
        }
        .card { background: #181820; padding: 15px 20px; border-radius: 8px; max-width: 1000px; margin: 20px auto 0 auto; text-align: left; }
        #log { background: #050508; color: #00ff66; padding: 10px; border-radius: 4px; font-family: monospace; height: 120px; overflow-y: auto; font-size: 12px; }
        input[type="file"] { padding: 6px 10px; font-size: 12px; }
    </style>
</head>
<body>

    <div class="top-toolbar">
        <input type="file" id="imageInput" accept="image/*" onchange="loadToCanvas(this)">
        
        <div style="display: flex; align-items: center; gap: 8px; margin-left: 15px; border-left: 1px solid #444; padding-left: 15px;">
            <label for="thresholdRange" style="font-size: 13px;">Порог тонирования:</label>
            <input type="range" id="thresholdRange" min="0.30" max="0.95" step="0.01" value="0.68" oninput="onThresholdInput(this.value)">
            <span id="thresholdVal" style="font-size: 13px; font-family: monospace; width: 35px;">0.68</span>
        </div>

        <span id="statusLabel" style="font-size: 13px; color: #aaa; margin-left: auto;">Загрузите схему</span>
    </div>

    <div class="container">
        <div id="viewport">
            <!-- Холст больше не имеет фиксированных 1000x600 в HTML, они зададутся динамически -->
            <canvas id="cv-canvas"></canvas>
        </div>

        <div class="card">
            <h3>Системный лог:</h3>
            <div id="log">Ожидание загрузки изображения...</div>
        </div>
    </div>

    <!-- Ядро загрузки с подстройкой под исходный размер -->
    <script>
        let imgElement = new Image();
        let originalImageSnapshot = null;
        let cleanedImageSnapshot = null;

        function logSys(text) {
            const box = document.getElementById('log');
            if (box) {
                box.innerHTML += `<div>> ${text}</div>`;
                box.scrollTop = box.scrollHeight;
            }
            console.log("SYS:", text);
        }

        function loadToCanvas(input) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imgElement.src = e.target.result;
                    imgElement.onload = () => {
                        const canvas = document.getElementById('cv-canvas');
                        const ctx = canvas.getContext('2d');

                        // Устанавливаем реальные размеры картинки в пикселях для холста
                        canvas.width = imgElement.naturalWidth;
                        canvas.height = imgElement.naturalHeight;

                        // Очищаем и рисуем изображение один в один
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(imgElement, 0, 0);
                        
                        originalImageSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        cleanedImageSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        logSys(`✅ Картинка загружена в исходном разрешении: ${canvas.width}x${canvas.height}px`);
                        document.getElementById('statusLabel').textContent = `Размер: ${canvas.width}x${canvas.height}`;

                        if (typeof resetRawSnapshot === 'function') {
                            resetRawSnapshot();
                        }

                        if (typeof convertToBlackAndWhite === 'function') {
                            convertToBlackAndWhite();
                        }
                    };
                }
                reader.readAsDataURL(input.files[0]);
            }
        }
    </script>

    <script src="script.js"></script>
</body>
</html>
