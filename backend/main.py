from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import os
import json

app = FastAPI(title="profДвижуха API")

# Путь к папке фронтенда
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend"))
LEADERBOARD_FILE = os.path.join(os.path.dirname(__file__), "leaderboard.json")

# Модель данных для сохранения результата в таблицу лидеров
class ScoreEntry(BaseModel):
    callsign: str
    difficulty: str
    reputation: int
    correct_cases: int

def load_leaderboard():
    if not os.path.exists(LEADERBOARD_FILE):
        return []
    try:
        with open(LEADERBOARD_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_leaderboard(data):
    try:
        with open(LEADERBOARD_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

@app.get("/api/leaderboard")
async def get_leaderboard():
    data = load_leaderboard()
    # Сортируем по репутации (по убыванию) и берем топ-10
    data.sort(key=lambda x: x.get("reputation", 0), reverse=True)
    return data[:10]

@app.post("/api/leaderboard")
async def post_leaderboard(entry: ScoreEntry):
    data = load_leaderboard()
    data.append(entry.dict())
    data.sort(key=lambda x: x.get("reputation", 0), reverse=True)
    save_leaderboard(data[:10])
    return {"status": "success"}

# Прямой маршрут для гарантированной выдачи иконки сайта (favicon)
@app.get("/icon.png")
async def get_icon():
    icon_path = os.path.join(FRONTEND_DIR, "icon.png")
    if os.path.exists(icon_path):
        return FileResponse(icon_path)
    # Запасной вариант, если иконка лежит в папке бэкенда
    backend_icon_path = os.path.join(os.path.dirname(__file__), "icon.png")
    if os.path.exists(backend_icon_path):
        return FileResponse(backend_icon_path)
    raise HTTPException(status_code=404, detail="Icon not found")

if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {"message": "Frontend directory not found!"}