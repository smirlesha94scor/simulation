import os
import json
import time
import re
from datetime import datetime
from playwright.sync_api import sync_playwright

AUTH_TOKEN = os.environ.get("TWITCH_AUTH_TOKEN")
DATA_FILE = "data.json"

# Максимальное время ожидания прироста серии на канале (в секундах)
WAIT_TIMEOUT_SECONDS = 600  # 10 минут
CHECK_INTERVAL_SECONDS = 20

def extract_number(text):
    """Извлекает число из текста с учетом пробелов и неразрывных пробелов"""
    cleaned = text.replace('\xa0', '').replace(' ', '')
    match = re.search(r'\d+', cleaned)
    return int(match.group()) if match else 0

def get_current_streak(page):
    """Находит и считывает серию просмотров без привязки к динамическим CSS-классам"""
    try:
        points_button = page.locator('button[data-a-target="player-channel-points-toggle-button"]')
        
        # Открываем меню наград, если оно еще не открыто
        if points_button.is_visible():
            points_button.click()
            time.sleep(2)

        # 1. Поиск по устойчивой ARIA-метке иконки серии просмотров
        streak_element = page.locator('svg[aria-label="Серия просмотров"], svg[aria-label="Watch Streak"]')
        
        if streak_element.count() > 0:
            # Поднимаемся к родительскому контейнеру, содержащему текст с цифрой
            parent_box = streak_element.first.locator('xpath=ancestor::div[contains(., "серия просмотров") or contains(., "Watch Streak")]')
            if parent_box.count() > 0:
                text = parent_box.first.inner_text()
                for line in text.split('\n'):
                    if "серия" in line.lower() or "streak" in line.lower():
                        num = extract_number(line)
                        return num, str(num)

        # 2. Резервный поиск по тексту без учета регистра
        text_fallback = page.locator('text=/серия просмотров|watch streak/i')
        if text_fallback.count() > 0:
            text = text_fallback.first.locator('xpath=..').inner_text()
            for line in text.split('\n'):
                if "серия" in line.lower() or "streak" in line.lower():
                    num = extract_number(line)
                    return num, str(num)

    except Exception as e:
        print(f"  [!] Ошибка считывания серии: {e}")

    return 0, "0"

def get_streaks():
    if not AUTH_TOKEN:
        print("Ошибка: TWITCH_AUTH_TOKEN не найден в переменных окружения.")
        return

    channels_data = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--autoplay-policy=no-user-gesture-required"]
        )
        context = browser.new_context()

        # Авторизация по auth-token
        context.add_cookies([{
            'name': 'auth-token',
            'value': AUTH_TOKEN,
            'domain': '.twitch.tv',
            'path': '/'
        }])

        page = context.new_page()

        print("Загружаем отслеживаемые live-каналы...")
        page.goto("https://www.twitch.tv/directory/following/live", wait_until="networkidle")
        time.sleep(3)

        links = page.locator('a[data-a-target="preview-card-channel-link"]').all()
        live_channels = []

        for link in links:
            href = link.get_attribute("href")
            if href and href.startswith("/"):
                channel_name = href.strip("/")
                if channel_name not in live_channels:
                    live_channels.append(channel_name)

        print(f"Найдено онлайн-каналов: {len(live_channels)}")

        for channel in live_channels:
            url = f"https://www.twitch.tv/{channel}"
            print(f"\n--- Проверяем канал: {channel} ---")
            
            try:
                page.goto(url, wait_until="domcontentloaded")
                time.sleep(5)

                initial_streak_num, initial_streak_str = get_current_streak(page)
                print(f"  -> Исходная серия просмотров: {initial_streak_num}")

                final_streak_str = initial_streak_str

                # Ждем увеличения серии для всех значений (начиная с 0)
                print(f"  ⏳ Ждем увеличения серии (макс {WAIT_TIMEOUT_SECONDS // 60} мин)...")
                
                start_time = time.time()
                while time.time() - start_time < WAIT_TIMEOUT_SECONDS:
                    time.sleep(CHECK_INTERVAL_SECONDS)
                    
                    current_num, current_str = get_current_streak(page)
                    elapsed = int(time.time() - start_time)
                    
                    print(f"     [{elapsed} сек] Текущая серия: {current_num}")

                    if current_num > initial_streak_num:
                        print(f"  🎉 УРА! Серия увеличилась: {initial_streak_num} -> {current_num}")
                        final_streak_str = current_str
                        break
                else:
                    print("  ⚠️ Время ожидания истекло, фиксируем текущий результат.")

                channels_data.append({
                    "name": channel,
                    "username": channel,
                    "isLive": True,
                    "streak": final_streak_str
                })

            except Exception as e:
                print(f"  [!] Ошибка при обработке канала {channel}: {e}")
                channels_data.append({
                    "name": channel,
                    "username": channel,
                    "isLive": True,
                    "streak": "0"
                })

        browser.close()

    result = {
        "updatedAt": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "channels": channels_data
    }

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("\nДанные успешно записаны в data.json")

if __name__ == "__main__":
    get_streaks()
