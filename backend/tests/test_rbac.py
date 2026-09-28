"""Tests for Role-Based Access Control (RBAC), Hierarchical Officer Roles,
Citizen Login, Jurisdiction Scoping, and Super-Admin User Management.
"""
import pytest
from app.main import app


def test_citizen_login_and_restrictions(client):
    """1. Citizens can log in and view citizen features, but are blocked from officer endpoints."""
    # A) Citizen Login
    login_res = client.post("/api/auth/citizen/login", json={
        "username": "citizen_ramesh",
        "password": "citizen123",
    })
    assert login_res.status_code == 200
    cit_data = login_res.json()
    assert cit_data["user"]["user_type"] == "citizen"
    assert cit_data["user"]["role"] == "citizen"
    token = cit_data["token"]
    cit_header = {"Authorization": f"Bearer {token}"}

    # B) Session /me endpoint confirms citizen status
    me_res = client.get("/api/auth/me", headers=cit_header).json()
    assert me_res["authenticated"] is True
    assert me_res["user_type"] == "citizen"
    assert me_res["role"] == "citizen"

    # C) Citizen is strictly FORBIDDEN (403) from accessing officer inbox & review queues
    denied_queue = client.get("/api/review-queue", headers=cit_header)
    assert denied_queue.status_code == 403
    assert "Access Denied" in denied_queue.json()["detail"]

    # D) Citizen is strictly FORBIDDEN from accessing user management APIs
    denied_admin = client.get("/api/admin/users", headers=cit_header)
    assert denied_admin.status_code == 403

    # E) Citizen is strictly FORBIDDEN from deciding or approving projects
    denied_project = client.post("/api/projects/1/decision", headers=cit_header, json={
        "decision": "approve",
        "reason": "Citizen cannot decide",
    })
    assert denied_project.status_code == 403


def test_officer_roles_login_and_permissions(client):
    """2. Officers select role and receive scoped claims and permissions."""
    # A) Super Admin Login
    sa_res = client.post("/api/auth/officer/login", json={
        "username": "superadmin",
        "password": "admin123",
    })
    assert sa_res.status_code == 200
    sa_data = sa_res.json()
    assert sa_data["user"]["role"] == "super_admin"
    sa_header = {"Authorization": f"Bearer {sa_data['token']}"}

    # Super Admin can view all users and stats
    stats_res = client.get("/api/admin/stats", headers=sa_header)
    assert stats_res.status_code == 200
    assert stats_res.json()["total_officers"] >= 5

    # B) District Officer Login (Collector Adilabad)
    dist_res = client.post("/api/auth/officer/login", json={
        "username": "collector_adilabad",
        "password": "district123",
    })
    assert dist_res.status_code == 200
    dist_data = dist_res.json()
    assert dist_data["user"]["role"] == "district_officer"
    assert dist_data["user"]["district"] == "Adilabad"
    dist_header = {"Authorization": f"Bearer {dist_data['token']}"}

    # District Officer can access officer inbox & review queue
    dist_queue = client.get("/api/review-queue", headers=dist_header)
    assert dist_queue.status_code == 200

    # District Officer cannot manage users (Super Admin only)
    dist_users_denied = client.get("/api/admin/users", headers=dist_header)
    assert dist_users_denied.status_code == 403

    # C) Field Officer Login
    field_res = client.post("/api/auth/officer/login", json={
        "username": "field_utnoor",
        "password": "field123",
    })
    assert field_res.status_code == 200
    field_data = field_res.json()
    assert field_data["user"]["role"] == "field_officer"
    field_header = {"Authorization": f"Bearer {field_data['token']}"}

    # Field officer cannot approve projects (only planner/district/admin roles can)
    field_proj_denied = client.post("/api/projects/1/decision", headers=field_header, json={
        "decision": "approve",
        "reason": "Field officer cannot approve",
    })
    assert field_proj_denied.status_code == 403


def test_super_admin_user_crud(client):
    """3. Super Admin can create, update, and manage officer accounts."""
    sa_res = client.post("/api/auth/officer/login", json={"username": "superadmin", "password": "admin123"}).json()
    sa_header = {"Authorization": f"Bearer {sa_res['token']}"}

    # Create new officer
    new_user_res = client.post("/api/admin/users", headers=sa_header, json={
        "username": "officer_warangal",
        "password": "warangal123",
        "name": "Dr. Ramesh Chandra",
        "title": "District Collector, Warangal",
        "role": "district_officer",
        "user_type": "officer",
        "country_code": "IN",
        "state": "Telangana",
        "district": "Warangal",
    })
    assert new_user_res.status_code == 200
    created_id = new_user_res.json()["user"]["id"]

    # Verify officer can log in with assigned role
    w_login = client.post("/api/auth/officer/login", json={"username": "officer_warangal", "password": "warangal123"})
    assert w_login.status_code == 200
    assert w_login.json()["user"]["district"] == "Warangal"

    # Update officer
    upd_res = client.put(f"/api/admin/users/{created_id}", headers=sa_header, json={
        "title": "Senior District Collector, Warangal & Hanamkonda",
    })
    assert upd_res.status_code == 200
    assert "Senior District Collector" in upd_res.json()["user"]["title"]

    # Deactivate officer
    del_res = client.delete(f"/api/admin/users/{created_id}", headers=sa_header)
    assert del_res.status_code == 200


def test_roles_and_jurisdictions_directory(client):
    """4. Directory API returns available roles, states, and departments."""
    dir_res = client.get("/api/auth/roles-jurisdictions")
    assert dir_res.status_code == 200
    data = dir_res.json()
    assert "roles" in data
    assert any(r["role"] == "super_admin" for r in data["roles"])
    assert any(r["role"] == "state_officer" for r in data["roles"])
    assert any(r["role"] == "district_officer" for r in data["roles"])
    assert any(r["role"] == "dept_officer" for r in data["roles"])
    assert "states_and_districts" in data
    assert "departments" in data
