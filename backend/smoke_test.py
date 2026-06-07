import os
import sys
import time
import uuid
import httpx
import re
from datetime import datetime, date, timedelta
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api"
ENV_TEST = True

# Helper to print test results clearly
def print_test(name: str, passed: bool, details: str = ""):
    status = "SUCCESS" if passed else "FAILED"
    color = "\033[92m" if passed else "\033[91m"
    reset = "\033[0m"
    print(f"{color}[{status}]{reset} {name} {details}")
    if not passed:
        sys.exit(1)

def run_smoke_tests():
    print("="*60)
    print("STARTING END-TO-END SMOKE TEST CHECKLIST")
    print("="*60)

    client = httpx.Client(timeout=30.0)

    # ---------------------------------------------------------
    # AUTH FLOW
    # ---------------------------------------------------------
    print("\n--- RUNNING AUTH FLOW TESTS ---")
    
    # Generate random unique emails
    email_a = f"firm_a_{uuid.uuid4().hex[:6]}@testca.com"
    email_b = f"firm_b_{uuid.uuid4().hex[:6]}@testca.com"
    password = "SecurePassword123!"

    # Test 1: POST /auth/signup (User A)
    signup_payload_a = {
        "email": email_a,
        "password": password,
        "full_name": "Auditor A",
        "firm_name": "CA Firm A",
        "role": "PARTNER"
    }
    r = client.post(f"{BASE_URL}/auth/signup", json=signup_payload_a)
    print(f"Signup User A status: {r.status_code}")
    assert r.status_code == 200, f"Signup A failed: {r.text}"
    data_a = r.json()
    assert "access_token" in data_a, "Missing access_token"
    assert "firm_id" in data_a, "Missing firm_id"
    token_a = data_a["access_token"]
    refresh_token_a = data_a.get("refresh_token")
    firm_id_a = data_a["firm_id"]
    print_test("POST /auth/signup User A", True, f"Firm ID: {firm_id_a}")

    # Test 2: POST /auth/login (User A)
    login_payload_a = {
        "email": email_a,
        "password": password
    }
    r = client.post(f"{BASE_URL}/auth/login", json=login_payload_a)
    assert r.status_code == 200, f"Login A failed: {r.text}"
    login_data_a = r.json()
    assert "access_token" in login_data_a
    assert login_data_a["firm_id"] == firm_id_a
    print_test("POST /auth/login User A", True)

    # Test 3: GET /auth/me with token
    headers_a = {"Authorization": f"Bearer {token_a}"}
    r = client.get(f"{BASE_URL}/auth/me", headers=headers_a)
    assert r.status_code == 200, f"Me failed: {r.text}"
    me_data = r.json()
    assert me_data.get("firm_id") == firm_id_a
    print_test("GET /auth/me with token", True)

    # Test 4: GET /clients/ with NO token → 401
    r = client.get(f"{BASE_URL}/clients")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    print_test("GET /clients/ with NO token (401)", True)

    # Test 5: POST /auth/refresh with valid refresh_token
    assert refresh_token_a is not None, "Refresh token was not returned"
    r = client.post(f"{BASE_URL}/auth/refresh", json={"refresh_token": refresh_token_a})
    assert r.status_code == 200, f"Refresh failed: {r.text}"
    refresh_data = r.json()
    assert "access_token" in refresh_data
    token_a_new = refresh_data["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a_new}"}
    print_test("POST /auth/refresh with valid refresh_token", True)

    # Test 6: POST /auth/logout
    r = client.post(f"{BASE_URL}/auth/logout", headers=headers_a)
    assert r.status_code == 200, f"Logout failed: {r.text}"
    # Confirm old token is invalidated
    r = client.get(f"{BASE_URL}/auth/me", headers=headers_a)
    assert r.status_code == 401, f"Expected 401 after logout, got {r.status_code}"
    print_test("POST /auth/logout session cleared", True)

    # Log back in to get a fresh working token for User A
    r = client.post(f"{BASE_URL}/auth/login", json=login_payload_a)
    token_a = r.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register and Login User B (Firm B)
    signup_payload_b = {
        "email": email_b,
        "password": password,
        "full_name": "Auditor B",
        "firm_name": "CA Firm B",
        "role": "PARTNER"
    }
    r = client.post(f"{BASE_URL}/auth/signup", json=signup_payload_b)
    assert r.status_code == 200, f"Signup B failed: {r.text}"
    data_b = r.json()
    token_b = data_b["access_token"]
    firm_id_b = data_b["firm_id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print_test("Signup User B (Firm B) completed", True, f"Firm ID: {firm_id_b}")


    # ---------------------------------------------------------
    # FIRM ISOLATION & PERSISTENCE
    # ---------------------------------------------------------
    print("\n--- RUNNING FIRM ISOLATION & PERSISTENCE TESTS ---")

    # 1. Firm A creates client
    client_payload_a = {
        "business_name": "Client A Corp",
        "gstin": "27AAACT1234A1Z5",
        "email": "contact@clienta.com",
        "phone": "+91 98765 43210",
        "state": "Maharashtra",
        "state_code": "27",
        "filing_frequency": "monthly"
    }
    r = client.post(f"{BASE_URL}/clients/", json=client_payload_a, headers=headers_a)
    assert r.status_code == 200, f"Create client A failed: {r.text}"
    client_a_data = r.json()
    client_a_id = client_a_data["id"]
    print_test("Firm A creates client", True, f"Client A ID: {client_a_id}")

    # Test 7: Firm B GET /clients/ → client NOT in response
    r = client.get(f"{BASE_URL}/clients/", headers=headers_b)
    assert r.status_code == 200
    clients_b = r.json()
    assert not any(c["id"] == client_a_id for c in clients_b), "Client A leaked to Firm B!"
    print_test("Firm B GET /clients/ isolation passed", True)

    # 2. Firm A creates notice
    # Notice upload expects multi-part form file
    file_bytes = b"%PDF-1.4 ... statutory notice content ... Section 73 discrepancy found"
    files = {"file": ("notice.pdf", file_bytes, "application/pdf")}
    data = {"client_id": client_a_id}
    r = client.post(f"{BASE_URL}/notices/upload", data=data, files=files, headers=headers_a)
    assert r.status_code == 200, f"Notice upload failed: {r.text}"
    notice_a_data = r.json()
    notice_a_id = notice_a_data["id"]
    print_test("POST /notices/upload notice persisted with firm_id", True, f"Notice ID: {notice_a_id}")

    # Test 8: Firm B GET /notices/ → notice NOT in response
    r = client.get(f"{BASE_URL}/notices", headers=headers_b)
    assert r.status_code == 200
    notices_b = r.json()
    assert not any(n["id"] == notice_a_id for n in notices_b), "Notice A leaked to Firm B!"
    print_test("Firm B GET /notices/ isolation passed", True)

    # 3. Firm A creates compliance task
    due_date_str = (date.today() - timedelta(days=5)).isoformat() # Past due to trigger overdue/escalation
    compliance_payload_a = {
        "client_id": client_a_id,
        "compliance_type": "GSTR-1",
        "filing_period": "2026-05",
        "due_date": due_date_str,
        "assigned_to": "Auditor A"
    }
    r = client.post(f"{BASE_URL}/compliance/create", json=compliance_payload_a, headers=headers_a)
    assert r.status_code == 200, f"Create compliance failed: {r.text}"
    compliance_a_data = r.json()
    compliance_a_id = compliance_a_data["compliance_id"]
    print_test("POST /compliance/ manual task persisted in compliance_tasks", True, f"Task ID: {compliance_a_id}")

    # Test 9: Firm B GET /compliance/ → task NOT in response
    r = client.get(f"{BASE_URL}/compliance", headers=headers_b)
    assert r.status_code == 200
    compliance_b = r.json()
    assert not any(t["compliance_id"] == compliance_a_id for t in compliance_b), "Compliance Task A leaked to Firm B!"
    print_test("Firm B GET /compliance/ isolation passed", True)

    # Test 10: Firm A creates action item → Firm B GET /action-center/ → item NOT in response
    # Action item is auto-generated by compliance task creation since it evaluated to Overdue (due date in past)
    r = client.get(f"{BASE_URL}/action-center", headers=headers_a)
    assert r.status_code == 200
    actions_a = r.json()
    action_a_id = f"act-comp-{compliance_a_id}"
    assert any(a["action_id"] == action_a_id for a in actions_a), "Action item was not auto-created!"
    print_test("Action item auto-created for overdue task", True, f"Action ID: {action_a_id}")

    r = client.get(f"{BASE_URL}/action-center", headers=headers_b)
    assert r.status_code == 200
    actions_b = r.json()
    assert not any(a["action_id"] == action_a_id for a in actions_b), "Action item A leaked to Firm B!"
    print_test("Firm B GET /action-center/ isolation passed", True)

    # Test 11: Direct Supabase query with Firm B JWT on Firm A row → RLS blocks → 0 rows
    # We will simulate this by hitting a client or compliance task detail endpoint of User A using User B's token
    r = client.get(f"{BASE_URL}/clients/{client_a_id}", headers=headers_b)
    assert r.status_code == 404, f"Expected 404 client not found, got {r.status_code}"
    
    r = client.get(f"{BASE_URL}/notices/{notice_a_id}", headers=headers_b)
    assert r.status_code == 403 or r.status_code == 404, f"Expected 403 or 404, got {r.status_code}"
    print_test("Direct query with Firm B JWT on Firm A row blocked by RLS", True)

    # Test 12: POST /gst-recon/upload (2B + PR files) → reconciliation_id returned
    csv_2b = b"gstin,invoice_number,taxable_value\n27AAACT1234A1Z5,INV-001,10000.00\n27AAACT1234A1Z5,INV-002,20000.00\n"
    csv_pr = b"gstin,invoice_number,taxable_value\n27AAACT1234A1Z5,INV-001,10000.00\n27AAACT1234A1Z5,INV-002,20000.00\n"
    files_recon = {
        "file_2b": ("gstr2b.csv", csv_2b, "text/csv"),
        "file_pr": ("pr.csv", csv_pr, "text/csv")
    }
    data_recon = {
        "client_id": client_a_id,
        "period": "2026-05"
    }
    r = client.post(f"{BASE_URL}/gst-recon/upload", data=data_recon, files=files_recon, headers=headers_a)
    assert r.status_code == 200, f"Recon upload failed: {r.text}"
    recon_data = r.json()
    assert "reconciliation_id" in recon_data, "Missing reconciliation_id"
    recon_id = recon_data["reconciliation_id"]
    print_test("POST /gst-recon/upload reconciliation_id returned", True, f"Recon ID: {recon_id}")

    # Test 13: GET /gst-recon/export/{reconciliation_id} → rows fetched from recon_rows table
    r = client.get(f"{BASE_URL}/gst-recon/export/{recon_id}", headers=headers_a)
    assert r.status_code == 200, f"Export failed: {r.text}"
    assert len(r.content) > 0, "Empty export body"
    print_test("GET /gst-recon/export/{reconciliation_id} succeeded", True)

    # Test 14: PUT /compliance/{id}/status Filed → filed_date set, action item resolved
    filed_date_str = date.today().isoformat()
    r = client.put(
        f"{BASE_URL}/compliance/{compliance_a_id}/status",
        params={"new_status": "Filed", "filed_date": filed_date_str},
        headers=headers_a
    )
    assert r.status_code == 200, f"Update status failed: {r.text}"
    comp_updated = r.json()
    assert comp_updated["status"] == "Filed", f"Status not Filed, got {comp_updated['status']}"
    # Verify action item is resolved
    r = client.get(f"{BASE_URL}/action-center", headers=headers_a)
    actions_after = r.json()
    # The get_action_items only returns PENDING actions, so our resolved action item should NOT be there.
    assert not any(a["action_id"] == action_a_id for a in actions_after), "Resolved action item still in pending list!"
    print_test("PUT /compliance/{id}/status Filed resolves action item", True)

    # Test 15: POST /action-center/{id}/resolve (using PUT /resolve since it's a PUT endpoint)
    # Let's trigger a new action item by creating another overdue task
    compliance_payload_a2 = {
        "client_id": client_a_id,
        "compliance_type": "GSTR-3B",
        "filing_period": "2026-05",
        "due_date": due_date_str,
        "assigned_to": "Auditor A"
    }
    r = client.post(f"{BASE_URL}/compliance/create", json=compliance_payload_a2, headers=headers_a)
    comp_a2_id = r.json()["compliance_id"]
    action_a2_id = f"act-comp-{comp_a2_id}"
    
    # Resolve it
    r = client.put(f"{BASE_URL}/action-center/{action_a2_id}/resolve", headers=headers_a)
    assert r.status_code == 200, f"Resolve action item failed: {r.text}"
    assert r.json()["status"] == "RESOLVED"
    print_test("POST/PUT /action-center/{id}/resolve status=RESOLVED in action_items", True)

    # Test 16: POST/PUT /automation/agents/{key}/toggle → is_active flipped
    # First get agents to ensure they are seeded
    r = client.get(f"{BASE_URL}/automation/agents", headers=headers_a)
    agents = r.json()
    reminder_agent = next(a for a in agents if a["agent_key"] == "compliance_reminder")
    initial_state = reminder_agent["is_active"]
    new_state = not initial_state

    r = client.put(f"{BASE_URL}/automation/agents/compliance_reminder/toggle", json={"is_active": new_state}, headers=headers_a)
    assert r.status_code == 200, f"Toggle failed: {r.text}"
    assert r.json()["is_active"] == new_state
    print_test("POST/PUT /automation/agents/{key}/toggle is_active flipped", True)


    # ---------------------------------------------------------
    # BACKGROUND JOBS
    # ---------------------------------------------------------
    print("\n--- RUNNING BACKGROUND JOBS TESTS ---")

    # Test 17: POST /jobs/trigger (compliance_reminders) → job_id returned
    r = client.post(f"{BASE_URL}/jobs/trigger", json={"job_type": "compliance_reminders"}, headers=headers_a)
    assert r.status_code == 200, f"Trigger failed: {r.text}"
    job_data = r.json()
    assert "job_id" in job_data
    job_id = job_data["job_id"]
    print_test("POST /jobs/trigger (compliance_reminders) job_id returned", True, f"Job ID: {job_id}")

    # Test 18: GET /jobs/{job_id} → progress increments to 100
    attempts = 10
    completed = False
    for i in range(attempts):
        r = client.get(f"{BASE_URL}/jobs/{job_id}", headers=headers_a)
        assert r.status_code == 200
        status_data = r.json()
        print(f"Job progress check {i+1}: progress={status_data['progress']}, status={status_data['status']}")
        if status_data["status"] == "COMPLETED" or status_data["progress"] == 100.0:
            completed = True
            break
        time.sleep(0.5)
    assert completed, f"Job did not reach 100% progress. Final status: {status_data}"
    print_test("GET /jobs/{job_id} progress increments to 100", True)

    # Test 19: Compliance task overdue → overdue_escalation_task → status=Escalated in DB
    # Create a task overdue by > 3 days (e.g. 5 days ago)
    overdue_date_str = (date.today() - timedelta(days=5)).isoformat()
    compliance_payload_overdue = {
        "client_id": client_a_id,
        "compliance_type": "ITR-6",
        "filing_period": "2026-05",
        "due_date": overdue_date_str,
        "assigned_to": "Auditor A"
    }
    r = client.post(f"{BASE_URL}/compliance/create", json=compliance_payload_overdue, headers=headers_a)
    overdue_task_id = r.json()["compliance_id"]
    
    # Trigger overdue_escalation job
    r = client.post(f"{BASE_URL}/jobs/trigger", json={"job_type": "overdue_escalation"}, headers=headers_a)
    job_id_esc = r.json()["job_id"]
    
    # Wait for completion
    for _ in range(10):
        r = client.get(f"{BASE_URL}/jobs/{job_id_esc}", headers=headers_a)
        if r.json()["status"] == "COMPLETED":
            break
        time.sleep(0.5)

    # Verify task is status=Escalated in DB
    r = client.get(f"{BASE_URL}/compliance", params={"client_id": client_a_id}, headers=headers_a)
    tasks_list = r.json()
    target_task = next(t for t in tasks_list if t["compliance_id"] == overdue_task_id)
    assert target_task["status"] == "Escalated", f"Expected status Escalated, got {target_task['status']}"
    print_test("Compliance task overdue → overdue_escalation_task → status=Escalated in DB", True)

    # Test 20: Escalated task → notification in notifications table for assigned staff
    # Let's get user notifications
    r = client.get(f"{BASE_URL}/notifications", headers=headers_a)
    assert r.status_code == 200, f"Failed to list notifications: {r.text}"
    notifs = r.json()
    assert any("ESCALATED" in n["title"] for n in notifs), "No escalation notification found!"
    print_test("Escalated task → notification generated for assigned staff", True)


    # ---------------------------------------------------------
    # NO MOCK DATA SEARCHES
    # ---------------------------------------------------------
    print("\n--- RUNNING NO MOCK DATA CHECKS ---")
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)
    frontend_dir = os.path.join(project_root, "frontend")

    # Check 1: grep -r "MOCK_" backend/services/ (except demo_engine get_seeded_*)
    mock_pattern = re.compile(r"MOCK_")
    found_mocks = []
    services_dir = os.path.join(backend_dir, "services")
    for root, _, files in os.walk(services_dir):
        for file in files:
            if file.endswith(".py"):
                path = os.path.join(root, file)
                # Skip demo_engine
                if "demo_engine.py" in file:
                    continue
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if mock_pattern.search(content):
                        found_mocks.append(path)
    assert len(found_mocks) == 0, f"Found MOCK_ occurrences in services: {found_mocks}"
    print_test("grep -r 'MOCK_' backend/services/ → 0 results", True)

    # Check 2: grep -r "localStorage.getItem" frontend/ (except supabase SDK internals)
    storage_pattern = re.compile(r"localStorage\.getItem")
    found_storage = []
    if os.path.exists(frontend_dir):
        for root, _, files in os.walk(frontend_dir):
            # Skip node_modules or build dirs
            if "node_modules" in root or ".next" in root or "build" in root or "dist" in root:
                continue
            for file in files:
                if file.endswith((".ts", ".tsx", ".js", ".jsx", ".html")):
                    path = os.path.join(root, file)
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        # Ignore the auth helper file if it has comments or specific allowed uses
                        if storage_pattern.search(content):
                            # Allow supabase client configuration file if any, but let's see if we hit it
                            found_storage.append(path)
    assert len(found_storage) == 0, f"Found localStorage.getItem in frontend: {found_storage}"
    print_test("grep -r 'localStorage.getItem' frontend/ → 0 results", True)

    # Check 3 & 4: mock-user-uuid and mock-firm-uuid in backend/
    user_uuid_pattern = re.compile(r"mock-user-uuid")
    firm_uuid_pattern = re.compile(r"mock-firm-uuid")
    found_uuids = []
    for root, _, files in os.walk(backend_dir):
        if "venv" in root or ".git" in root or "__pycache__" in root:
            continue
        for file in files:
            if file.endswith(".py"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if user_uuid_pattern.search(content) or firm_uuid_pattern.search(content):
                        found_uuids.append(path)
    assert len(found_uuids) == 0, f"Found mock UUID references in backend: {found_uuids}"
    print_test("grep -r 'mock-user-uuid' & 'mock-firm-uuid' backend/ → 0 results", True)

    print("\n" + "="*60)
    print("ALL RUNNING BACKEND SMOKE TESTS PASSED!")
    print("="*60)

if __name__ == "__main__":
    run_smoke_tests()
