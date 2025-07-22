import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import httpx
from typing import List, Dict, Any
from datetime import datetime

load_dotenv()

FRESHDESK_API_KEY = os.getenv("FRESHDESK_API_KEY")
FRESHDESK_DOMAIN = os.getenv("FRESHDESK_DOMAIN")
FRESHDESK_BASE_URL = f"https://{FRESHDESK_DOMAIN}.freshdesk.com/api/v2"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def fetch_tickets(from_date: str, to_date: str) -> List[Dict[str, Any]]:
    headers = {"Content-Type": "application/json"}
    auth = (FRESHDESK_API_KEY, "X")
    params = {
        "updated_since": from_date,
        # Freshdesk API does not support 'to_date' directly, so we filter after fetch
    }
    tickets = []
    async with httpx.AsyncClient() as client:
        url = f"{FRESHDESK_BASE_URL}/tickets"
        page = 1
        while True:
            response = await client.get(url, headers=headers, auth=auth, params={**params, "page": page})
            response.raise_for_status()
            data = response.json()
            if not data:
                break
            for ticket in data:
                created_at = ticket.get("created_at", "")
                if created_at and created_at >= from_date and created_at <= to_date:
                    tickets.append(ticket)
            page += 1
    return tickets

def summarize_by_field(tickets: List[Dict[str, Any]], field: str) -> Dict[str, int]:
    summary = {}
    for ticket in tickets:
        value = ticket.get(field, "Unknown")
        summary[value] = summary.get(value, 0) + 1
    return summary

@app.get("/tickets")
async def get_tickets(from_date: str = Query(...), to_date: str = Query(...)):
    tickets = await fetch_tickets(from_date, to_date)
    return {"tickets": tickets}

@app.get("/summary/category")
async def category_summary(from_date: str = Query(...), to_date: str = Query(...)):
    tickets = await fetch_tickets(from_date, to_date)
    return summarize_by_field(tickets, "category")

@app.get("/summary/severity")
async def severity_summary(from_date: str = Query(...), to_date: str = Query(...)):
    tickets = await fetch_tickets(from_date, to_date)
    return summarize_by_field(tickets, "priority")  # Freshdesk uses 'priority' for severity

@app.get("/summary/type")
async def type_summary(from_date: str = Query(...), to_date: str = Query(...)):
    tickets = await fetch_tickets(from_date, to_date)
    return summarize_by_field(tickets, "type")

@app.get("/focus-areas")
async def key_focus_areas(from_date: str = Query(...), to_date: str = Query(...)):
    tickets = await fetch_tickets(from_date, to_date)
    # Example: Top 5 categories
    category_summary = summarize_by_field(tickets, "category")
    top_categories = sorted(category_summary.items(), key=lambda x: x[1], reverse=True)[:5]
    # Example: Top 5 subjects
    subject_summary = summarize_by_field(tickets, "subject")
    top_subjects = sorted(subject_summary.items(), key=lambda x: x[1], reverse=True)[:5]
    return {
        "top_categories": top_categories,
        "top_subjects": top_subjects,
        "total_tickets": len(tickets)
    }