import os
import json
import time
import re
from datetime import datetime
from playwright.sync_api import sync_playwright

AUTH_TOKEN = os.environ.get("TWITCH_AUTH_TOKEN")
DATA_FILE = "data.json"

# Максимальное время ожидания прироста серии на канале (в секундах)
# 12 минут = 720 секунд (Twitch обычно засчитывает просмотр за 5-10 минут)
WAIT_TIMEOUT_SECONDS = 720 
CHECK_INTERVAL_SECONDS = 30

def extract_number(text):
    """Извлекает первое число из текста"""
    match = re.search(r'\d+', str(text))
    return int(match.group()) if match else 0

def get_current_streak(page):
    """Функция для открытия меню баллов и считывания цифры серии"""
    try:
        points_button = page.locator('button[data-a-target="player-channel-points-toggle-button"]')
        if points_button.is_visible():
            points_button.click()
            time.sleep(1.5)

            streak_element = page.locator('text=/серия просмотров|Watch Streak/i')
            if streak_element.is_visible():
                parent_text = streak_element.locator('..').inner_text()
                for line in parent_text.split("\n"):
                    if "серия" in line.lower() or "streak" in line.lower():
                        val = line.split(":")[-1].strip()
                        # Закрываем меню кликом обратно, чтобы не перекрывать плеер
                        points_button.click()
                        return extract_number(val), val
            points_button.click()
    except Exception as e:
        print(f"  [!] Ошибка при считывании меню: {e}")
    return 0, "0"

def get_streaks():
    if not AUTH_TOKEN:
        print("Ошибка: TWITCH_AUTH_TOKEN не найден.")
        return

    channels_data = []

    with sync_playwright() as p:
        # Запускаем Chromium с включенным автовоспроизведением звука/видео,
        # чтобы Twitch засчитывал просмотр трансляции
        browser = p.chromium.launch(
            headless=True,
            args=["--autoplay-policy=no-user-gesture-required"]
        )
        context = browser.new_context()

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

                # Считываем начальный стрик
                initial_streak_num, initial_streak_str = get_current_streak(page)
                print(f"  -> Исходная серия просмотров: {initial_streak_num}")

                final_streak_str = initial_streak_str

                # УСЛОВИЕ: Если серия больше 2 — ждем ее увеличения
                if initial_streak_num > 2:
                    print(f"  ⏳ Серия больше 2! Остаемся на стриме и ждем увеличения (макс {WAIT_TIMEOUT_SECONDS // 60} мин)...")
                    
                    start_time = time.time()
                    while time.time() - start_time < WAIT_TIMEOUT_SECONDS:
                        time.sleep(CHECK_INTERVAL_SECONDS)
                        
                        current_num, current_str = get_current_streak(page)
                        elapsed = int(time.time() - start_time)
                        
                        print(f"     [{elapsed} сек] Текущая серия: {current_num}")

                        if current_num > initial_streak_num:
                            print(f"  🎉 УРА! Серия увеличена: {initial_streak_num} -> {current_num}")
                            final_streak_str = current_str
                            break
                    else:
                        print("  ⚠️ Время ожидания истекло, серия не изменилась за данный интервал.")
                else:
                    print("  ℹ️ Серия <= 2, ожидание не требуется.")

                channels_data.append({
                    "name": channel,
                    "username": channel,
                    "isLive": True,
                    "streak": final_streak_str
                })

            except Exception as e:
                print(f"  [!] Ошибка с каналом {channel}: {e}")
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

    print("\nДанные успешно сохранены в data.json")

if __name__ == "__main__":
    get_streaks()
