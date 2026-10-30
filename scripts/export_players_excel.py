"""
TKPL Players Excel Export Utility
Reusable script to export all live player registrations and payments into a formatted Excel workbook.
"""

import os
import sys
from datetime import datetime, timezone, timedelta
import requests
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

IST = timezone(timedelta(hours=5, minutes=30))

# Load environment variables from .env
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
env_vars = {}
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")

SUPABASE_URL = env_vars.get("SUPABASE_URL", "https://sjyvugxszlyxxmravzzt.supabase.co")
SERVICE_KEY = env_vars.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SERVICE_KEY:
    print("Error: SUPABASE_SERVICE_ROLE_KEY not found in .env")
    sys.exit(1)

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

# Fetch players
p_res = requests.get(
    f"{SUPABASE_URL}/rest/v1/players?select=*&order=registration_no.asc",
    headers=headers,
    timeout=15,
)
p_res.raise_for_status()
players = p_res.json()

# Fetch payments
pay_res = requests.get(
    f"{SUPABASE_URL}/rest/v1/payments?select=*&order=created_at.asc",
    headers=headers,
    timeout=15,
)
pay_res.raise_for_status()
payments = pay_res.json()

# Map payments by player_id
pay_map = {pay.get("player_id"): pay for pay in payments}

# Combine
combined = []
for p in players:
    pay = pay_map.get(p.get("id"), {})
    combined.append({
        "player": p,
        "payment": pay,
    })

now_ist_str = datetime.now(IST).strftime("%d %b %Y, %I:%M %p IST")

wb = openpyxl.Workbook()

# Styles
FONT_TITLE = Font(name="Calibri", size=16, bold=True, color="FFFFFF")
FONT_SUBTITLE = Font(name="Calibri", size=11, italic=True, color="E2E8F0")
FONT_HEADER = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
FONT_BOLD = Font(name="Calibri", size=11, bold=True)
FONT_REGULAR = Font(name="Calibri", size=10)
FONT_KPI_VAL = Font(name="Calibri", size=20, bold=True, color="10B981")
FONT_KPI_LBL = Font(name="Calibri", size=9, bold=True, color="64748B")

FILL_HEADER_DARK = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
FILL_HEADER_GREEN = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")
FILL_HEADER_AMBER = PatternFill(start_color="92400E", end_color="92400E", fill_type="solid")
FILL_HEADER_BLUE = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
FILL_ZEBRA = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
FILL_GREEN_BADGE = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
FILL_AMBER_BADGE = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

ALIGN_CENTER = Alignment(horizontal="center", vertical="center")
ALIGN_LEFT = Alignment(horizontal="left", vertical="center")
ALIGN_RIGHT = Alignment(horizontal="right", vertical="center")

BORDER_THIN = Border(
    left=Side(style="thin", color="CBD5E1"),
    right=Side(style="thin", color="CBD5E1"),
    top=Side(style="thin", color="CBD5E1"),
    bottom=Side(style="thin", color="CBD5E1"),
)

def format_role(r):
    mapping = {
        "all_rounder": "All-Rounder",
        "batter": "Batter",
        "bowler": "Bowler",
        "wicketkeeper": "Wicketkeeper",
    }
    return mapping.get(r, str(r).replace("_", " ").title())

def format_hand(h):
    return "Right Hand" if h == "right_hand" else ("Left Hand" if h == "left_hand" else str(h or "-"))

def format_bowling(b):
    mapping = {
        "right_arm_pace": "Right-arm Pace",
        "right_arm_spin": "Right-arm Spin",
        "left_arm_pace": "Left-arm Pace",
        "left_arm_spin": "Left-arm Spin",
        "none": "None",
    }
    return mapping.get(b, str(b or "-").replace("_", " ").title())

def format_iso(ts):
    if not ts:
        return "-"
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.astimezone(IST).strftime("%d-%m-%Y %I:%M %p")
    except Exception:
        return ts

# -------------------------------------------------------------
# SHEET 1: SUMMARY DASHBOARD
# -------------------------------------------------------------
ws_summary = wb.active
ws_summary.title = "Summary Dashboard"
ws_summary.views.sheetView[0].showGridLines = True

# Title banner
ws_summary.merge_cells("A1:G2")
banner_cell = ws_summary["A1"]
banner_cell.value = "T-KPL 2026 · Tennis Ball Kadapa Premier League"
banner_cell.font = FONT_TITLE
banner_cell.fill = FILL_HEADER_DARK
banner_cell.alignment = ALIGN_CENTER

ws_summary.merge_cells("A3:G3")
sub_cell = ws_summary["A3"]
sub_cell.value = f"Live Roster Report — Generated on {now_ist_str}"
sub_cell.font = FONT_SUBTITLE
sub_cell.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
sub_cell.alignment = ALIGN_CENTER

total_players = len(combined)
approved_count = sum(1 for c in combined if c["payment"].get("status") == "verified" and c["player"].get("registration_status") == "approved")
pending_count = total_players - approved_count
total_fees_collected = sum((c["payment"].get("amount_paise", 0) or 0) for c in combined if c["payment"].get("status") == "verified") / 100

# KPI Cards
kpis = [
    ("TOTAL REGISTRATIONS", str(total_players), "A5:B5", "A6:B6", "10B981"),
    ("APPROVED & VERIFIED", str(approved_count), "C5:D5", "C6:D6", "059669"),
    ("PAYMENT PENDING", str(pending_count), "E5:F5", "E6:F6", "D97706"),
    ("FEES COLLECTED (₹)", f"₹{total_fees_collected:,.0f}", "G5:G5", "G6:G6", "2563EB"),
]

for label, val, top_range, bottom_range, color_hex in kpis:
    ws_summary.merge_cells(top_range)
    top_cell = ws_summary[top_range.split(":")[0]]
    top_cell.value = label
    top_cell.font = FONT_KPI_LBL
    top_cell.alignment = ALIGN_CENTER
    top_cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    ws_summary.merge_cells(bottom_range)
    b_cell = ws_summary[bottom_range.split(":")[0]]
    b_cell.value = val
    b_cell.font = Font(name="Calibri", size=18, bold=True, color=color_hex)
    b_cell.alignment = ALIGN_CENTER
    b_cell.fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

    for row in ws_summary[f"{top_range.split(':')[0]}:{bottom_range.split(':')[1]}"]:
        for c in row:
            c.border = BORDER_THIN

# Role Breakdown Table
ws_summary.cell(row=8, column=1, value="PLAYING ROLE BREAKDOWN").font = FONT_BOLD
ws_summary.cell(row=9, column=1, value="Role").font = FONT_HEADER
ws_summary.cell(row=9, column=1).fill = FILL_HEADER_DARK
ws_summary.cell(row=9, column=2, value="Total").font = FONT_HEADER
ws_summary.cell(row=9, column=2).fill = FILL_HEADER_DARK
ws_summary.cell(row=9, column=3, value="Approved").font = FONT_HEADER
ws_summary.cell(row=9, column=3).fill = FILL_HEADER_DARK
ws_summary.cell(row=9, column=4, value="Pending").font = FONT_HEADER
ws_summary.cell(row=9, column=4).fill = FILL_HEADER_DARK

roles = ["all_rounder", "batter", "bowler", "wicketkeeper"]
for idx, r in enumerate(roles, start=10):
    r_total = sum(1 for c in combined if c["player"].get("role") == r)
    r_app = sum(1 for c in combined if c["player"].get("role") == r and c["payment"].get("status") == "verified")
    r_pnd = r_total - r_app
    ws_summary.cell(row=idx, column=1, value=format_role(r)).font = FONT_REGULAR
    ws_summary.cell(row=idx, column=2, value=r_total).font = FONT_BOLD
    ws_summary.cell(row=idx, column=3, value=r_app).font = FONT_REGULAR
    ws_summary.cell(row=idx, column=4, value=r_pnd).font = FONT_REGULAR
    for c in range(1, 5):
        cell = ws_summary.cell(row=idx, column=c)
        cell.border = BORDER_THIN
        if c > 1:
            cell.alignment = ALIGN_CENTER

# -------------------------------------------------------------
# HELPER: POPULATE DATA SHEET
# -------------------------------------------------------------
def build_roster_sheet(sheet, filter_kind):
    sheet.views.sheetView[0].showGridLines = True

    cols = [
        ("S.No", 8, ALIGN_CENTER),
        ("Registration No", 18, ALIGN_CENTER),
        ("Player Name", 26, ALIGN_LEFT),
        ("Mobile Number", 16, ALIGN_CENTER),
        ("Date of Birth", 14, ALIGN_CENTER),
        ("Locality / Village", 26, ALIGN_LEFT),
        ("Role", 15, ALIGN_CENTER),
        ("Batting Hand", 14, ALIGN_CENTER),
        ("Bowling Style", 18, ALIGN_CENTER),
        ("Experience", 20, ALIGN_LEFT),
        ("Profile Status", 15, ALIGN_CENTER),
        ("Payment Status", 16, ALIGN_CENTER),
        ("Receipt Number", 22, ALIGN_CENTER),
        ("Amount (₹)", 12, ALIGN_RIGHT),
        ("Payment Date (IST)", 20, ALIGN_CENTER),
        ("Registered At (IST)", 20, ALIGN_CENTER),
        ("Review / Notes", 25, ALIGN_LEFT),
    ]

    header_fill = FILL_HEADER_GREEN if filter_kind == "approved" else (FILL_HEADER_AMBER if filter_kind == "pending" else FILL_HEADER_BLUE)

    for c_idx, (col_name, width, align) in enumerate(cols, start=1):
        cell = sheet.cell(row=1, column=c_idx, value=col_name)
        cell.font = FONT_HEADER
        cell.fill = header_fill
        cell.alignment = align
        sheet.column_dimensions[get_column_letter(c_idx)].width = width

    sheet.row_dimensions[1].height = 28

    if filter_kind == "approved":
        data_rows = [c for c in combined if c["payment"].get("status") == "verified" and c["player"].get("registration_status") == "approved"]
    elif filter_kind == "pending":
        data_rows = [c for c in combined if not (c["payment"].get("status") == "verified" and c["player"].get("registration_status") == "approved")]
    else:
        data_rows = combined

    for r_idx, item in enumerate(data_rows, start=2):
        p = item["player"]
        pay = item["payment"]
        amt = (pay.get("amount_paise") or 0) / 100 if pay.get("amount_paise") else 0

        vals = [
            r_idx - 1,
            p.get("registration_no", ""),
            p.get("full_name", ""),
            p.get("phone", ""),
            p.get("date_of_birth", ""),
            p.get("locality", ""),
            format_role(p.get("role")),
            format_hand(p.get("batting_hand")),
            format_bowling(p.get("bowling_style")),
            p.get("experience", "-"),
            str(p.get("registration_status", "")).title(),
            ("Verified" if pay.get("status") == "verified" else "Pending"),
            pay.get("receipt_no") or "-",
            f"₹{amt:,.0f}" if amt else "-",
            format_iso(pay.get("paid_at")),
            format_iso(p.get("created_at")),
            p.get("review_notes") or "-",
        ]

        sheet.row_dimensions[r_idx].height = 20
        is_even = (r_idx % 2 == 0)

        for c_idx, val in enumerate(vals, start=1):
            cell = sheet.cell(row=r_idx, column=c_idx, value=val)
            cell.font = FONT_REGULAR
            cell.border = BORDER_THIN
            cell.alignment = cols[c_idx - 1][2]

            if is_even:
                cell.fill = FILL_ZEBRA

            # Highlight payment status badge
            if c_idx == 12:
                if val == "Verified":
                    cell.fill = FILL_GREEN_BADGE
                    cell.font = Font(name="Calibri", size=10, bold=True, color="065F46")
                else:
                    cell.fill = FILL_AMBER_BADGE
                    cell.font = Font(name="Calibri", size=10, bold=True, color="92400E")

    sheet.freeze_panes = "C2"
    sheet.auto_filter.ref = sheet.dimensions

# -------------------------------------------------------------
# BUILD SUBSEQUENT SHEETS
# -------------------------------------------------------------
ws_approved = wb.create_sheet(title=f"Approved & Verified ({approved_count})")
build_roster_sheet(ws_approved, "approved")

ws_pending = wb.create_sheet(title=f"Payment Pending ({pending_count})")
build_roster_sheet(ws_pending, "pending")

ws_all = wb.create_sheet(title=f"All Registrations ({total_players})")
build_roster_sheet(ws_all, "all")

# Adjust summary columns width
for col in ["A", "B", "C", "D", "E", "F", "G"]:
    ws_summary.column_dimensions[col].width = 18

# Save paths
REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)
FILE_IN_REPORTS = os.path.join(REPORTS_DIR, "TKPL_Registered_Players.xlsx")
wb.save(FILE_IN_REPORTS)

# Save convenient desktop copy
DESKTOP_DIR = os.path.join(os.path.expanduser("~"), "Desktop")
FILE_ON_DESKTOP = os.path.join(DESKTOP_DIR, "TKPL_Registered_Players.xlsx")
try:
    wb.save(FILE_ON_DESKTOP)
    desktop_saved = True
except Exception as e:
    desktop_saved = False

print(f"SUCCESS: Exported {total_players} players (Approved: {approved_count}, Pending: {pending_count})")
print(f"Reports Path: {os.path.abspath(FILE_IN_REPORTS)}")
if desktop_saved:
    print(f"Desktop Path: {os.path.abspath(FILE_ON_DESKTOP)}")
