#!/usr/bin/env python3
"""
SoulSync — Bay Leaf Manifestation by Pooja Garg
Full-Stack Web Server with Secure Registration Database & Admin Portal
"""

import http.server
import socketserver
import json
import sqlite3
import os
import sys
import urllib.parse
import hashlib
import time
import secrets
import csv
import io
from datetime import datetime

PORT = int(os.environ.get("PORT", 8080))
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "soulsync.db")
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

# Admin credentials (can be customized via environment variables)
ADMIN_USERNAME = os.environ.get("ADMIN_USER", "pooja")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASS", "soulsync2026!")

# Simple in-memory session tokens store {token: timestamp}
ACTIVE_SESSIONS = {}
SESSION_EXPIRY_SECONDS = 86400 * 7  # 7 days

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            country_code TEXT DEFAULT '+91',
            manifestation_goal TEXT NOT NULL,
            timeline TEXT NOT NULL,
            preferred_contact TEXT DEFAULT 'WhatsApp',
            status TEXT DEFAULT 'New Intent Received',
            admin_notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            client_ip TEXT
        )
    """)
    conn.commit()
    conn.close()

def is_valid_token(token):
    if not token or token not in ACTIVE_SESSIONS:
        return False
    created_at = ACTIVE_SESSIONS[token]
    if time.time() - created_at > SESSION_EXPIRY_SECONDS:
        del ACTIVE_SESSIONS[token]
        return False
    return True

class SoulSyncRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def send_json_response(self, data, status_code=200, headers=None):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        if headers:
            for k, v in headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def get_auth_token(self):
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header.split("Bearer ", 1)[1].strip()
        # Also check cookie
        cookie_header = self.headers.get("Cookie", "")
        for item in cookie_header.split(";"):
            item = item.strip()
            if item.startswith("soulsync_token="):
                return item.split("=", 1)[1].strip()
        # Also check URL query parameter (used for direct CSV download)
        parsed_url = urllib.parse.urlparse(self.path)
        query_params = urllib.parse.parse_qs(parsed_url.query)
        if "token" in query_params and query_params["token"]:
            return query_params["token"][0].strip()
        return None

    def require_admin(self):
        token = self.get_auth_token()
        if not is_valid_token(token):
            self.send_json_response({"error": "Unauthorized. Please log in as administrator."}, status_code=401)
            return False
        return True

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        # Route aliases
        if path == "/admin" or path == "/admin/":
            self.path = "/admin.html"
            return super().do_GET()

        # API Endpoints
        if path == "/api/admin/registrations":
            if not self.require_admin():
                return
            
            query_params = urllib.parse.parse_qs(parsed_url.query)
            search = query_params.get("search", [""])[0].strip()
            status_filter = query_params.get("status", [""])[0].strip()

            conn = get_db()
            cursor = conn.cursor()
            
            sql = "SELECT * FROM registrations WHERE 1=1"
            params = []
            if search:
                sql += " AND (full_name LIKE ? OR phone LIKE ? OR manifestation_goal LIKE ?)"
                search_param = f"%{search}%"
                params.extend([search_param, search_param, search_param])
            if status_filter:
                sql += " AND status = ?"
                params.append(status_filter)
            
            sql += " ORDER BY id DESC"
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            
            registrations = [dict(row) for row in rows]
            conn.close()

            self.send_json_response({
                "success": True,
                "count": len(registrations),
                "data": registrations
            })
            return

        elif path == "/api/admin/stats":
            if not self.require_admin():
                return
            
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as total FROM registrations")
            total = cursor.fetchone()["total"]

            cursor.execute("SELECT COUNT(*) as new_leads FROM registrations WHERE status = 'New Intent Received'")
            new_leads = cursor.fetchone()["new_leads"]

            cursor.execute("SELECT COUNT(*) as active_sessions FROM registrations WHERE status IN ('Payment Received', 'Session Scheduled')")
            active_sessions = cursor.fetchone()["active_sessions"]

            cursor.execute("SELECT COUNT(*) as completed FROM registrations WHERE status = 'Completed'")
            completed = cursor.fetchone()["completed"]
            conn.close()

            self.send_json_response({
                "success": True,
                "stats": {
                    "total": total,
                    "new_leads": new_leads,
                    "active_sessions": active_sessions,
                    "completed": completed
                }
            })
            return

        elif path == "/api/admin/export":
            if not self.require_admin():
                return
            
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id, full_name, phone, country_code, manifestation_goal, timeline, preferred_contact, status, admin_notes, created_at FROM registrations ORDER BY id DESC")
            rows = cursor.fetchall()
            conn.close()

            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["ID", "Full Name", "Phone", "Country Code", "Manifestation Goal", "Timeline", "Preferred Contact", "Status", "Notes", "Registration Date"])
            for row in rows:
                writer.writerow(list(row))

            csv_data = output.getvalue().encode("utf-8-sig")
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", f"attachment; filename=soulsync_registrations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
            self.send_header("Content-Length", str(len(csv_data)))
            self.end_headers()
            self.wfile.write(csv_data)
            return

        # Fallback to static file server
        return super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        # 1. Public Registration Form Submission
        if path == "/api/register":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
            except Exception:
                self.send_json_response({"error": "Invalid JSON data provided"}, status_code=400)
                return

            full_name = data.get("fullName", "").strip()
            phone = data.get("phone", "").strip()
            country_code = data.get("countryCode", "+91").strip()
            manifestation_goal = data.get("manifestationGoal", "").strip()
            timeline = data.get("timeline", "21 Days").strip()
            preferred_contact = data.get("preferredContact", "WhatsApp").strip()

            # Validation
            if not full_name:
                self.send_json_response({"error": "Please provide your Full Name"}, status_code=422)
                return
            if not phone or len(phone) < 7:
                self.send_json_response({"error": "Please provide a valid Phone / WhatsApp number"}, status_code=422)
                return
            if not manifestation_goal or len(manifestation_goal) < 5:
                self.send_json_response({"error": "Please describe what you wish to manifest"}, status_code=422)
                return

            client_ip = self.headers.get("X-Forwarded-For", self.client_address[0])

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO registrations (full_name, phone, country_code, manifestation_goal, timeline, preferred_contact, client_ip)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (full_name, phone, country_code, manifestation_goal, timeline, preferred_contact, client_ip))
            new_id = cursor.lastrowid
            conn.commit()
            conn.close()

            # Respond with confirmation as specified
            self.send_json_response({
                "success": True,
                "registrationId": new_id,
                "message": "Your intention has been set! Pooja Garg will reach out personally on WhatsApp/Phone shortly.",
                "applicant": {
                    "name": full_name,
                    "timeline": timeline,
                    "contact": f"{country_code} {phone}"
                }
            }, status_code=201)
            return

        # 2. Admin Login
        elif path == "/api/admin/login":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
            except Exception:
                self.send_json_response({"error": "Invalid request body"}, status_code=400)
                return

            username = data.get("username", "").strip()
            password = data.get("password", "").strip()

            if username.lower() == ADMIN_USERNAME.lower() and password == ADMIN_PASSWORD:
                token = secrets.token_hex(24)
                ACTIVE_SESSIONS[token] = time.time()
                self.send_json_response({
                    "success": True,
                    "token": token,
                    "admin": "Pooja Garg",
                    "message": "Welcome, Pooja Garg. Master database unlocked."
                }, headers={"Set-Cookie": f"soulsync_token={token}; Path=/; SameSite=Lax; Max-Age={SESSION_EXPIRY_SECONDS}"})
            else:
                self.send_json_response({"error": "Invalid username or password."}, status_code=401)
            return

        # 3. Admin Logout
        elif path == "/api/admin/logout":
            token = self.get_auth_token()
            if token in ACTIVE_SESSIONS:
                del ACTIVE_SESSIONS[token]
            self.send_json_response(
                {"success": True, "message": "Logged out successfully."},
                headers={"Set-Cookie": "soulsync_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"}
            )
            return

        self.send_json_response({"error": "Endpoint not found"}, status_code=404)

    def do_PATCH(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/admin/registrations/"):
            if not self.require_admin():
                return
            
            try:
                reg_id = int(path.split("/")[-1])
            except ValueError:
                self.send_json_response({"error": "Invalid registration ID"}, status_code=400)
                return

            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
            except Exception:
                self.send_json_response({"error": "Invalid JSON"}, status_code=400)
                return

            status = data.get("status")
            notes = data.get("admin_notes")

            conn = get_db()
            cursor = conn.cursor()

            if status is not None and notes is not None:
                cursor.execute("UPDATE registrations SET status = ?, admin_notes = ? WHERE id = ?", (status, notes, reg_id))
            elif status is not None:
                cursor.execute("UPDATE registrations SET status = ? WHERE id = ?", (status, reg_id))
            elif notes is not None:
                cursor.execute("UPDATE registrations SET admin_notes = ? WHERE id = ?", (notes, reg_id))
            
            conn.commit()
            conn.close()

            self.send_json_response({"success": True, "message": "Registration record updated successfully."})
            return

        self.send_json_response({"error": "Endpoint not found"}, status_code=404)

def run():
    init_db()
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SoulSyncRequestHandler) as httpd:
        print(f"============================================================")
        print(f"✨ SoulSync Web Server is running on http://localhost:{PORT}")
        print(f"✨ Public Site:     http://localhost:{PORT}/")
        print(f"✨ Admin Dashboard: http://localhost:{PORT}/admin")
        print(f"✨ Default Admin:   {ADMIN_USERNAME} / {ADMIN_PASSWORD}")
        print(f"============================================================")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")
            httpd.server_close()

if __name__ == "__main__":
    run()
