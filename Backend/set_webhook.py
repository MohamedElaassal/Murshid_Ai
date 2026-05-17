import os
import httpx
import argparse
from dotenv import load_dotenv

load_dotenv()

def set_webhook(url: str):
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        print("Error: TELEGRAM_BOT_TOKEN environment variable not set.")
        return
        
    api_url = f"https://api.telegram.org/bot{bot_token}/setWebhook"
    
    response = httpx.post(api_url, json={"url": url})
    print(response.json())

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Set Telegram Bot Webhook")
    parser.add_argument("url", help="The HTTPS URL for your FastAPI /webhook endpoint (e.g. from ngrok)")
    args = parser.parse_args()
    
    set_webhook(args.url)
