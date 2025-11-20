from flask import Flask, request, jsonify
import pandas as pd
import gspread
from oauth2client.service_account import ServiceAccountCredentials

app = Flask(__name__)

# Google Sheets API
scope = ["https://spreadsheets.google.com/feeds","https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", scope)
client = gspread.authorize(creds)

def scrape_site(site_url):
    # Buraya Onur Market scraper gelecek
    return pd.DataFrame([
        {"barcode": "1234567890001", "name": "Domates", "brand": "Yerel", "category": "Sebze", "price": 39.90, "stock": 100, "imgurl": "https://.../domates.png"}
    ])

@app.route("/scrape-to-sheets", methods=["POST"])
def scrape_to_sheets():
    data = request.get_json()
    site_url = data.get("site_url")

    # 1. scrape et
    df = scrape_site(site_url)

    # 2. Google Sheet oluştur
    sheet = client.create("Market Ürünleri")
    worksheet = sheet.get_worksheet(0)
    worksheet.update([df.columns.values.tolist()] + df.values.tolist())

    sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet.id}/edit#gid=0"

    return jsonify({"sheet_url": sheet_url})

if __name__ == "__main__":
    app.run(port=5000, debug=True)
