import os
import json
import time
import re
from datetime import datetime
from playwright.sync_api import sync_playwright

AUTH_TOKEN = os.environ.get("TWITCH_AUTH_TOKEN")
DATA_FILE = "data.json"

# Настройки времени ожидания
MAX_WATCH_TIME_SEC = 800  # Максимум 10 минут ожидания на один канал (600 секунд)
CHECK_INTERVAL_SEC = 15   # Проверять изменение серии каждые 15 секунд

def extract_number(text):
    cleaned = text.replace('\xa0', '').replace(' ', '')
    match = re.search(r'\d+', cleaned)
    return int(match.group()) if match else 0

def get_current_streak(page):
    try:
        # 1. Попытка закрыть возможные всплывающие оверлеи (кнопки "Начать!", "Понятно" и т.д.)
        popups = page.locator('button:has-text("Начать!"), button:has-text("Понятно"), button[aria-label="Закрыть"]')
        if popups.count() > 0 and popups.first.is_visible():
            try:
                popups.first.click(timeout=2000)
                time.sleep(0.5)
            except Exception:
                pass

        # 2. Ищем кнопку баллов
        points_btn = page.locator('button[aria-label="Баланс Bits и баллов"], button[data-a-target="player-channel-points-toggle-button"]')
        
        if points_btn.count() > 0 and points_btn.first.is_visible():
            # Используем force=True, чтобы кликнуть, даже если сверху висит оверлей
            points_btn.first.click(force=True)
            time.sleep(1.2)

        open_streak_btn = page.locator('button[aria-label="Открыть меню серии просмотров"], button[aria-label*="серии просмотров"]')
        if open_streak_btn.count() > 0 and open_streak_btn.first.is_visible():
            open_streak_btn.first.click(force=True)
            time.sleep(1.0)

        # 3. Считываем значение серии
        streak_h2 = page.locator('div:has-text("Ваша серия просмотров") h2, h2:has(+ div:has-text("Ваша серия просмотров"))')
        
        if streak_h2.count() > 0:
            val = extract_number(streak_h2.first.inner_text())
            if val > 0:
                if points_btn.first.is_visible():
                    points_btn.first.click(force=True)
                return val, str(val)

        modal_h2 = page.locator('div[role="dialog"] h2, div[aria-label*="Серия просмотров"] h2')
        if modal_h2.count() > 0:
            for h2 in modal_h2.all():
                val = extract_number(h2.inner_text())
                if val > 0:
                    if points_btn.first.is_visible():
                        points_btn.first.click(force=True)
                    return val, str(val)

        if points_btn.first.is_visible():
            points_btn.first.click(force=True)

    except Exception as e:
        print(f"  [!] Ошибка считывания серии: {e}")

    return 0, "0"

def process_channel(page, channel):
    url = f"https://www.twitch.tv/{channel}"
    print(f"\n--- Переход на канал: {channel} ---")
    
    try:
        page.goto(url, wait_until="domcontentloaded")
        time.sleep(4)

        # Считываем начальную серию
        initial_num, initial_str = get_current_streak(page)
        print(f"  -> Изначальная серия просмотров: {initial_str}")

        start_time = time.time()
        final_num = initial_num
        final_str = initial_str

        # Цикл ожидания увеличения серии (до 10 минут)
        while time.time() - start_time < MAX_WATCH_TIME_SEC:
            time.sleep(CHECK_INTERVAL_SEC)
            current_num, current_str = get_current_streak(page)

            # Если серия увеличилась
            if current_num > initial_num:
                print(f"  🎉 Серия увеличилась! Стало: {current_str}")
                final_num = current_num
                final_str = current_str
                break
            
            elapsed = int(time.time() - start_time)
            print(f"  ⏳ Прошло {elapsed}s / {MAX_WATCH_TIME_SEC}s. Текущая серия: {current_str}")

        return {
            "name": channel,
            "username": channel,
            "isLive": True,
            "streak": final_str
        }

    except Exception as e:
        print(f"  [!] Ошибка при обработке {channel}: {e}")
        return {
            "name": channel,
            "username": channel,
            "isLive": True,
            "streak": "0"
        }

def get_streaks():
    if not AUTH_TOKEN:
        print("Ошибка: TWITCH_AUTH_TOKEN не найден.")
        return

    channels_data = []

    with sync_playwright() as p:
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

        print("Сканируем активные live-каналы...")
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

        if not live_channels:
            print("❌ Нет доступных каналов в эфире.")
            browser.close()
            return

        print(f"Всего найдено онлайн-каналов: {len(live_channels)}")

        # Проходим по каждому онлайн-каналу
        for index, channel in enumerate(live_channels, 1):
            print(f"\n[{index}/{len(live_channels)}] Обработка канала {channel}")
            ch_info = process_channel(page, channel)
            channels_data.append(ch_info)

        browser.close()

    result = {
        "updatedAt": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "channels": channels_data
    }

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("\nОбработка всех каналов завершена, данные сохранены в data.json")

if __name__ == "__main__":
    get_streaks()
