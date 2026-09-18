import os
import json
import time
import re
import random
from datetime import datetime
from playwright.sync_api import sync_playwright

# Выбирать случайный канал из списка онлайн (True) или просто первый по порядку (False)?
SELECT_RANDOM = False

AUTH_TOKEN = os.environ.get("TWITCH_AUTH_TOKEN")
DATA_FILE = "data.json"

WAIT_TIMEOUT_SECONDS = 600
CHECK_INTERVAL_SECONDS = 20

def extract_number(text):
    cleaned = text.replace('\xa0', '').replace(' ', '')
    match = re.search(r'\d+', cleaned)
    return int(match.group()) if match else 0

def get_current_streak(page):
    try:
        points_btn = page.locator('button[data-a-target="player-channel-points-toggle-button"]')
        
        if points_btn.count() > 0 and points_btn.first.is_visible():
            points_btn.first.click()
            time.sleep(2)

        open_streak_btn = page.locator('button[aria-label="Открыть меню серии просмотров"], button[aria-label*="серии просмотров"]')
        if open_streak_btn.count() > 0 and open_streak_btn.first.is_visible():
            open_streak_btn.first.click()
            time.sleep(1.5)

        streak_h2 = page.locator('div:has-text("Ваша серия просмотров") h2, h2:has(+ div:has-text("Ваша серия просмотров"))')
        
        if streak_h2.count() > 0:
            val = extract_number(streak_h2.first.inner_text())
            if val > 0:
                if points_btn.first.is_visible():
                    points_btn.first.click()
                return val, str(val)

        modal_h2 = page.locator('div[role="dialog"] h2, div[aria-label*="Серия просмотров"] h2')
        if modal_h2.count() > 0:
            for h2 in modal_h2.all():
                val = extract_number(h2.inner_text())
                if val > 0:
                    if points_btn.first.is_visible():
                        points_btn.first.click()
                    return val, str(val)

        if points_btn.first.is_visible():
            points_btn.first.click()

    except Exception as e:
        print(f"  [!] Ошибка считывания серии: {e}")

    return 0, "0"

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

        # Выбираем строго один канал
        if SELECT_RANDOM:
            selected_channel = random.choice(live_channels)
            print(f"🎯 Случайно выбран канал: {selected_channel}")
        else:
            selected_channel = live_channels[0]
            print(f"🎯 Выбран первый канал в списке: {selected_channel}")

        url = f"https://www.twitch.tv/{selected_channel}"
        print(f"\n--- Проверяем канал: {selected_channel} ---")
        
        try:
            page.goto(url, wait_until="domcontentloaded")
            time.sleep(5)

            initial_streak_num, initial_streak_str = get_current_streak(page)
            print(f"  -> Исходная серия просмотров: {initial_streak_num}")

            final_streak_str = initial_streak_str

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
                print("  ⚠️ Время ожидания истекло, сохраняем текущую серию.")

            channels_data.append({
                "name": selected_channel,
                "username": selected_channel,
                "isLive": True,
                "streak": final_streak_str
            })

        except Exception as e:
            print(f"  [!] Ошибка с каналом {selected_channel}: {e}")
            channels_data.append({
                "name": selected_channel,
                "username": selected_channel,
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

    print("\nДанные сохранены в data.json")

if __name__ == "__main__":
    get_streaks()
