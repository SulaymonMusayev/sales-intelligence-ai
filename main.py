
import os
import random
from datetime import date, datetime, timedelta
from typing import Optional

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest

load_dotenv()

app = FastAPI(title="Sales Intelligence AI API", version="1.0.0")
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_ORIGIN", ""),
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in origins if origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PRODUCTS = [
    ("Wireless Headphones", "Electronics", 79, 38),
    ("Smart Watch", "Electronics", 129, 72),
    ("Coffee Maker", "Home", 89, 48),
    ("Desk Lamp", "Home", 39, 17),
    ("Running Shoes", "Fashion", 95, 49),
    ("Backpack", "Fashion", 59, 26),
    ("Water Bottle", "Lifestyle", 24, 8),
    ("Yoga Mat", "Lifestyle", 35, 14),
]
CHANNELS = ["Website", "Mobile App", "Marketplace", "Retail"]
REGIONS = ["Tashkent", "Samarkand", "Bukhara", "Fergana", "Andijan"]


class DashboardRequest(BaseModel):
    period: str = "month"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    analysis_type: str = "overview"
    seed: Optional[int] = None


def date_range(req: DashboardRequest):
    today = date.today()
    if req.period == "custom" and req.start_date and req.end_date:
        try:
            start = date.fromisoformat(req.start_date)
            end = date.fromisoformat(req.end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Dates must use YYYY-MM-DD format")
        if end < start:
            raise HTTPException(status_code=400, detail="End date must be on or after start date")
        if (end - start).days > 365:
            raise HTTPException(status_code=400, detail="Date range cannot exceed 366 days")
        return start, end
    if req.period == "week":
        return today - timedelta(days=6), today
    if req.period == "month":
        return today - timedelta(days=29), today
    if req.period == "quarter":
        return today - timedelta(days=89), today
    return today - timedelta(days=29), today


def build_records(start: date, end: date, seed: int):
    rng = random.Random(seed)
    span = max(1, (end - start).days + 1)
    count = min(850, max(45, int(span * 7.2)))
    rows = []
    for i in range(count):
        day = start + timedelta(days=rng.randrange(span))
        name, category, price, cost = rng.choice(PRODUCTS)
        quantity = rng.choices([1, 2, 3, 4, 5], weights=[48, 28, 14, 7, 3])[0]
        # A few synthetic outliers make the anomaly feature demonstrable.
        if i % 83 == 0:
            quantity = rng.randint(8, 18)
        revenue = round(price * quantity * rng.uniform(0.92, 1.08), 2)
        unit_cost = cost * quantity
        discount = round(revenue * rng.choice([0, 0, 0.03, 0.07, 0.12]), 2)
        revenue = round(max(1, revenue - discount), 2)
        profit = round(revenue - unit_cost, 2)
        rows.append({
            "id": f"ORD-{day.strftime('%y%m%d')}-{i+1:04d}",
            "date": day.isoformat(),
            "product": name,
            "category": category,
            "channel": rng.choice(CHANNELS),
            "region": rng.choice(REGIONS),
            "quantity": quantity,
            "revenue": revenue,
            "cost": round(unit_cost, 2),
            "profit": profit,
            "customer": f"Customer {rng.randint(1001, 1499)}",
        })
    return pd.DataFrame(rows).sort_values("date", ascending=False).reset_index(drop=True)


def analyze_records(df: pd.DataFrame):
    if len(df) >= 20:
        model = IsolationForest(contamination=0.035, random_state=42)
        features = df[["revenue", "quantity", "profit"]].fillna(0)
        df["anomaly"] = model.fit_predict(features) == -1
    else:
        df["anomaly"] = False
    return df


def make_payload(req: DashboardRequest):
    start, end = date_range(req)
    seed = req.seed if req.seed is not None else int(datetime.now().timestamp() // 3600)
    df = analyze_records(build_records(start, end, seed))
    revenue = float(df["revenue"].sum())
    profit = float(df["profit"].sum())
    orders = int(len(df))
    previous_revenue = revenue * random.Random(seed + 17).uniform(0.84, 1.12)
    growth = ((revenue - previous_revenue) / previous_revenue * 100) if previous_revenue else 0
    daily = df.groupby("date", as_index=False).agg(revenue=("revenue", "sum"), profit=("profit", "sum"), orders=("id", "count"))
    product = df.groupby("product", as_index=False).agg(revenue=("revenue", "sum"), profit=("profit", "sum"), orders=("id", "count")).sort_values("revenue", ascending=False)
    channel = df.groupby("channel", as_index=False).agg(revenue=("revenue", "sum"), orders=("id", "count")).sort_values("revenue", ascending=False)
    category = df.groupby("category", as_index=False).agg(revenue=("revenue", "sum"), profit=("profit", "sum")).sort_values("revenue", ascending=False)
    region = df.groupby("region", as_index=False).agg(revenue=("revenue", "sum"), orders=("id", "count")).sort_values("revenue", ascending=False)
    transactions = df.copy()
    transactions["anomaly"] = transactions["anomaly"].astype(bool)
    transactions = transactions.where(pd.notnull(transactions), None)
    return {
        "meta": {
            "synthetic": True,
            "period": req.period,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "seed": seed,
        },
        "kpis": {
            "revenue": round(revenue, 2),
            "profit": round(profit, 2),
            "orders": orders,
            "average_order_value": round(revenue / orders, 2) if orders else 0,
            "profit_margin": round(profit / revenue * 100, 1) if revenue else 0,
            "growth": round(growth, 1),
        },
        "charts": {
            "daily": daily.to_dict(orient="records"),
            "products": product.head(7).round(2).to_dict(orient="records"),
            "channels": channel.round(2).to_dict(orient="records"),
            "categories": category.round(2).to_dict(orient="records"),
            "regions": region.round(2).to_dict(orient="records"),
        },
        "transactions": transactions.head(250).to_dict(orient="records"),
        "anomaly_count": int(df["anomaly"].sum()),
    }


@app.get("/")
def root():
    return {"status": "ok", "service": "Sales Intelligence AI API", "synthetic_data": True}


@app.get("/api/health")
def health():
    return {"status": "ok", "synthetic_data": True}


@app.post("/api/dashboard")
def dashboard(req: DashboardRequest):
    return make_payload(req)


@app.post("/api/insights")
def insights(payload: dict):
    kpis = payload.get("kpis", {})
    charts = payload.get("charts", {})
    anomaly_count = payload.get("anomaly_count", 0)
    best = (charts.get("products") or [{}])[0]
    prompt = (
        "You are a concise business sales analyst. The data below is synthetic demo data, "
        "not real company data. Do not invent metrics. Return valid JSON with keys: summary "
        "(string), positives (array of strings), risks (array of strings), recommendations "
        "(array of strings). Use Uzbek Latin. Keep advice practical and tie it to provided values. "
        f"KPIs: {kpis}. Top product: {best}. Potential anomalous transactions: {anomaly_count}."
    )
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                contents=prompt,
                config={"response_mime_type": "application/json"},
            )
            import json
            result = json.loads(response.text)
            result["source"] = "gemini"
            result["synthetic_data"] = True
            return result
        except Exception:
            pass

    revenue = float(kpis.get("revenue", 0))
    margin = float(kpis.get("profit_margin", 0))
    growth = float(kpis.get("growth", 0))
    return {
        "summary": f"Tanlangan davrda {revenue:,.0f} daromad qayd etildi. Bu raqamlar sun’iy demo ma’lumotlar asosida hisoblangan.",
        "positives": [
            f"Eng ko‘p daromad keltirgan mahsulot: {best.get('product', 'ma’lumot mavjud emas')}.",
            f"Foyda marjasi {margin:.1f}% ni tashkil etdi.",
        ],
        "risks": [
            f"Isolation Forest {anomaly_count} ta noodatiy tranzaksiyani belgiladi; ularni alohida tekshirish kerak.",
            "O‘sish ko‘rsatkichi sun’iy oldingi davr bilan taqqoslangan, real biznes natijasi emas.",
        ],
        "recommendations": [
            "Eng ko‘p sotilgan mahsulotlar bo‘yicha zaxira va mavjudlikni kuzating.",
            "Kam foyda berayotgan kategoriyalarda tannarx va chegirmalarni solishtiring.",
            "Noodatiy tranzaksiyalarni miqdor, narx va foyda bo‘yicha tekshiring.",
        ],
        "source": "fallback",
        "synthetic_data": True,
    }
