import os
import sys
import tempfile
import time
import unittest
from pathlib import Path


TEST_DATA = tempfile.TemporaryDirectory(prefix="susu-api-tests-")
API_DIR = Path(__file__).resolve().parents[1]
os.environ["PORTAL_DATA_DIR"] = TEST_DATA.name
os.environ.pop("DATABASE_URL", None)
sys.path.insert(0, str(API_DIR))

import app as portal  # noqa: E402


OWNER_EMAIL = "sitecreator@bawjiasecommunitybank.com"
OWNER_PASSWORD = "OwnerTest#2026"


class PortalSecurityTests(unittest.TestCase):
    def setUp(self):
        users = [portal.normalize_user(dict(portal.OWNER_ADMIN_USER))]
        owner = portal.find_user_by_email(users, OWNER_EMAIL)
        owner["forcePasswordChange"] = False
        portal.save_user_store(users)
        portal.save_password_store({
            OWNER_EMAIL: portal.hash_password_for_storage(OWNER_PASSWORD),
        })
        portal.atomic_write_json(portal.SESSIONS_STORE_PATH, {})
        portal.atomic_write_json(portal.AGENT_SETUP_TOKENS_PATH, {})
        portal.atomic_write_json(portal.AUDIT_LOGS_STORE_PATH, [])
        portal.atomic_write_json(portal.CUSTOMERS_STORE_PATH, [])
        portal.atomic_write_json(portal.COLLECTIONS_STORE_PATH, [])
        portal.atomic_write_json(portal.DAILY_CLOSES_STORE_PATH, [])
        portal.atomic_write_json(portal.RATE_LIMIT_STORE_PATH, {})
        portal.save_portal_settings_store(dict(portal.DEFAULT_PORTAL_SETTINGS))
        portal.FAILED_AUTH_ATTEMPTS.clear()
        self.client = portal.app.test_client()

    def login_owner(self, remember=False):
        return self.client.post("/api/auth/login", json={
            "email": OWNER_EMAIL,
            "passwordHash": OWNER_PASSWORD,
            "remember": remember,
        })

    def test_public_settings_never_expose_secrets(self):
        response = self.client.get("/api/portal-settings")
        self.assertEqual(response.status_code, 200)
        settings = response.get_json()["settings"]
        self.assertNotIn("portalControlPassword", settings)
        self.assertNotIn("itAccessCode", settings)
        self.assertNotIn("hrAccessCode", settings)
        self.assertNotIn("updatedBy", settings)

    def test_email_dependent_flows_are_disabled_without_mail_configuration(self):
        self.assertFalse(portal.email_delivery_configured())
        registration = self.client.post("/api/auth/register", json={})
        reset = self.client.post("/api/auth/request-password-reset", json={})
        self.assertEqual(registration.status_code, 503)
        self.assertEqual(reset.status_code, 503)

    def test_login_uses_httponly_cookie_and_me_endpoint(self):
        response = self.login_owner(remember=True)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("token", response.get_json())
        cookie = response.headers.get("Set-Cookie", "")
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=Strict", cookie)
        self.assertIn("Max-Age=", cookie)
        me = self.client.get("/api/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.get_json()["user"]["role"], "OwnerAdmin")

    def test_expired_session_is_rejected_and_removed(self):
        self.assertEqual(self.login_owner().status_code, 200)
        sessions = portal.load_sessions()
        self.assertTrue(sessions)
        for session in sessions.values():
            session["expiresAt"] = int(time.time()) - 1
        portal.save_sessions(sessions)
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(portal.load_sessions(), {})

    def test_owner_created_staff_must_replace_temporary_password(self):
        users = portal.load_user_store()
        staff = portal.normalize_user({
            "id": "staff-test", "fullname": "Test Staff", "phone": "0240000000",
            "email": "staff@bawjiasecommunitybank.com", "department": "SUSU",
            "branch": "HEAD OFFICE", "forcePasswordChange": True,
        })
        users.append(staff)
        portal.save_user_store(users)
        passwords = portal.load_password_store()
        passwords[staff["email"]] = portal.hash_password_for_storage("Temporary#2026")
        portal.save_password_store(passwords)

        login = self.client.post("/api/auth/login", json={
            "email": staff["email"],
            "passwordHash": "Temporary#2026",
        })
        self.assertEqual(login.status_code, 200)
        self.assertTrue(login.get_json()["requiresPasswordChange"])
        self.assertNotIn("Set-Cookie", login.headers)

        changed = self.client.post("/api/auth/complete-password-change", json={
            "email": staff["email"],
            "temporaryPassword": "Temporary#2026",
            "newPassword": "Permanent#2026",
        })
        self.assertEqual(changed.status_code, 200)
        self.assertIn("HttpOnly", changed.headers.get("Set-Cookie", ""))
        self.assertFalse(portal.find_user_by_email(portal.load_user_store(), staff["email"])["forcePasswordChange"])

        reused = self.client.post("/api/auth/complete-password-change", json={
            "email": staff["email"],
            "temporaryPassword": "Temporary#2026",
            "newPassword": "AnotherStrong#2026",
        })
        self.assertEqual(reused.status_code, 401)

    def test_backup_excludes_live_sessions(self):
        self.assertEqual(self.login_owner().status_code, 200)
        passphrase = "VeryStrongBackup#2026"
        backup = self.client.post("/api/backup/export", json={"passphrase": passphrase})
        self.assertEqual(backup.status_code, 200)
        payload = portal.decrypt_backup_payload(backup.get_json(), passphrase)
        stores = payload["stores"]
        self.assertNotIn("sessions", stores)
        self.assertNotIn("presence", stores)

    def create_agent_and_customer(self):
        users = portal.load_user_store()
        agent = portal.normalize_user({
            "id": "agent-test", "fullname": "Test Agent", "phone": "0240000001",
            "email": "agent@bawjiasecommunitybank.com", "department": "SUSU AGENT",
            "branch": "HEAD OFFICE", "isActive": True, "isVerified": True,
        })
        users.append(agent)
        portal.save_user_store(users)
        passwords = portal.load_password_store()
        passwords[agent["email"]] = portal.hash_password_for_storage("AgentStrong#2026")
        portal.save_password_store(passwords)
        customer = {
            "id": "customer-test", "account_name": "Trusted Customer",
            "account_number": "1310000100999", "branch_id": "HEAD OFFICE",
            "branch_name": "HEAD OFFICE", "customer_status": "active",
            "environment": "test", "total_deposits": 0,
        }
        portal.atomic_write_json(portal.CUSTOMERS_STORE_PATH, [customer])
        return agent, customer

    def test_deposit_fields_are_server_owned_idempotent_and_reversible(self):
        agent, customer = self.create_agent_and_customer()
        login = self.client.post("/api/auth/login", json={
            "email": agent["email"], "passwordHash": "AgentStrong#2026",
        })
        self.assertEqual(login.status_code, 200)
        payload = {
            "customer_id": customer["id"], "amount": "25.50",
            "idempotency_key": "deposit-request-00000001",
            "transaction_date": "2001-01-01", "transaction_time": "00:00",
            "account_name": "ATTACKER", "account_number": "0000000000000",
            "agent_name": "Fake Agent", "status": "reversed",
            "supervisor_review_status": "approved",
        }
        first = self.client.post("/api/collections", json=payload)
        second = self.client.post("/api/collections", json=payload)
        self.assertEqual(first.status_code, 200)
        self.assertTrue(second.get_json()["duplicate"])
        item = first.get_json()["collection"]
        self.assertEqual(item["account_name"], customer["account_name"])
        self.assertEqual(item["agent_name"], agent["fullname"])
        self.assertEqual(item["transaction_date"], time.strftime("%Y-%m-%d"))
        self.assertEqual(item["status"], "completed")
        self.assertEqual(item["supervisor_review_status"], "pending")
        self.assertEqual(len(portal.load_json_list_store(portal.COLLECTIONS_STORE_PATH)), 1)
        self.client.post("/api/auth/logout", json={})
        self.assertEqual(self.login_owner().status_code, 200)
        rejected = self.client.post(f"/api/collections/{item['id']}/review", json={
            "supervisor_review_status": "rejected", "correction_note": "Cash did not reconcile",
        })
        self.assertEqual(rejected.status_code, 200)
        self.assertEqual(rejected.get_json()["collection"]["status"], "reversed")
        stored_customer = portal.load_json_list_store(portal.CUSTOMERS_STORE_PATH)[0]
        self.assertEqual(stored_customer["totalDepositsPesewas"], 0)

    def test_session_tokens_are_hashed_at_rest(self):
        response = self.login_owner()
        self.assertEqual(response.status_code, 200)
        cookie = response.headers["Set-Cookie"].split(";", 1)[0].split("=", 1)[1]
        sessions = portal.load_sessions()
        self.assertNotIn(cookie, sessions)
        self.assertIn(portal.session_token_key(cookie), sessions)

    def test_authenticated_password_change_revokes_old_session(self):
        self.assertEqual(self.login_owner().status_code, 200)
        changed = self.client.post("/api/auth/change-password", json={
            "currentPassword": OWNER_PASSWORD,
            "newPassword": "Replacement#2026",
        })
        self.assertEqual(changed.status_code, 200)
        self.client.post("/api/auth/logout", json={})
        old_login = self.client.post("/api/auth/login", json={"email": OWNER_EMAIL, "passwordHash": OWNER_PASSWORD})
        new_login = self.client.post("/api/auth/login", json={"email": OWNER_EMAIL, "passwordHash": "Replacement#2026"})
        self.assertEqual(old_login.status_code, 401)
        self.assertEqual(new_login.status_code, 200)

    def test_privileged_login_supports_totp_mfa(self):
        secret = portal.pyotp.random_base32()
        previous = os.environ.get("MFA_SECRETS_JSON")
        os.environ["MFA_SECRETS_JSON"] = '{"sitecreator@bawjiasecommunitybank.com":"' + secret + '"}'
        try:
            first = self.login_owner()
            self.assertTrue(first.get_json()["mfaRequired"])
            verified = self.client.post("/api/auth/login", json={
                "email": OWNER_EMAIL,
                "passwordHash": OWNER_PASSWORD,
                "mfaCode": portal.pyotp.TOTP(secret).now(),
            })
            self.assertEqual(verified.status_code, 200)
        finally:
            if previous is None:
                os.environ.pop("MFA_SECRETS_JSON", None)
            else:
                os.environ["MFA_SECRETS_JSON"] = previous

    def test_test_data_clear_preserves_audit_history(self):
        self.assertEqual(self.login_owner().status_code, 200)
        portal.record_audit_log(portal.find_user_by_email(portal.load_user_store(), OWNER_EMAIL), "BEFORE_CLEAR", {"reason": "evidence"}, "127.0.0.1")
        response = self.client.post("/api/maintenance/clear-test-data", json={"backupConfirmed": True})
        self.assertEqual(response.status_code, 200)
        actions = [item["action"] for item in portal.load_audit_logs_store()]
        self.assertIn("BEFORE_CLEAR", actions)
        self.assertIn("CLEAR_TEST_DATA", actions)

    def test_live_writes_fail_closed_without_production_controls(self):
        agent, customer = self.create_agent_and_customer()
        settings = dict(portal.DEFAULT_PORTAL_SETTINGS)
        settings["appMode"] = "live"
        portal.save_portal_settings_store(settings)
        self.client.post("/api/auth/login", json={"email": agent["email"], "passwordHash": "AgentStrong#2026"})
        response = self.client.post("/api/collections", json={
            "customer_id": customer["id"], "amount": "10.00",
            "idempotency_key": "live-request-0000000001",
        })
        self.assertEqual(response.status_code, 503)

    def test_daily_close_reconciles_cash_and_requires_manager_review(self):
        agent, customer = self.create_agent_and_customer()
        self.client.post("/api/auth/login", json={"email": agent["email"], "passwordHash": "AgentStrong#2026"})
        deposit = self.client.post("/api/collections", json={
            "customer_id": customer["id"], "amount": "25.50",
            "idempotency_key": "close-test-request-00001",
        })
        self.assertEqual(deposit.status_code, 200)
        closed = self.client.post("/api/daily-close", json={"cash_counted": "25.50"})
        self.assertEqual(closed.status_code, 200)
        close = closed.get_json()["close"]
        self.assertEqual(close["variancePesewas"], 0)
        self.assertEqual(close["reviewStatus"], "pending")
        self.client.post("/api/auth/logout", json={})
        self.assertEqual(self.login_owner().status_code, 200)
        reviewed = self.client.post("/api/daily-close/review", json={
            "agentId": agent["id"], "date": time.strftime("%Y-%m-%d"),
            "status": "approved", "note": "Cash reconciled",
        })
        self.assertEqual(reviewed.status_code, 200)
        self.assertEqual(reviewed.get_json()["close"]["reviewStatus"], "approved")

    def test_permanent_staff_deletion_is_disabled(self):
        self.assertEqual(self.login_owner().status_code, 200)
        self.assertEqual(self.client.post("/api/staff/anything/delete", json={}).status_code, 405)

    def test_reset_url_uses_only_trusted_public_origin(self):
        previous = os.environ.get("PORTAL_PUBLIC_URL")
        os.environ["PORTAL_PUBLIC_URL"] = "https://portal.example.com"
        try:
            url = portal.build_reset_url("https://attacker.example/steal", "secret-token")
        finally:
            if previous is None:
                os.environ.pop("PORTAL_PUBLIC_URL", None)
            else:
                os.environ["PORTAL_PUBLIC_URL"] = previous
        self.assertTrue(url.startswith("https://portal.example.com/reset-password?"))
        self.assertNotIn("attacker.example", url)

    def test_agent_setup_code_is_random_hashed_and_one_time(self):
        code = portal.issue_agent_setup_code("agent-test")
        self.assertRegex(code, r"^\d{6}$")
        stored = portal.read_json_file(portal.AGENT_SETUP_TOKENS_PATH, {})["agent-test"]
        self.assertNotEqual(stored["codeHash"], code)
        self.assertTrue(portal.consume_agent_setup_code("agent-test", code))
        self.assertFalse(portal.consume_agent_setup_code("agent-test", code))

    def test_audit_log_mutations_are_disabled(self):
        self.assertEqual(self.client.post("/api/audit-logs", json={}).status_code, 405)
        self.assertEqual(self.client.post("/api/audit-logs/delete", json={}).status_code, 405)

    def test_cross_origin_mutation_is_blocked(self):
        response = self.client.post(
            "/api/auth/login",
            headers={"Origin": "https://attacker.example"},
            json={"email": OWNER_EMAIL, "passwordHash": OWNER_PASSWORD},
        )
        self.assertEqual(response.status_code, 403)

    def test_money_is_converted_to_exact_pesewas(self):
        self.assertEqual(portal.money_to_pesewas("10.25"), 1025)
        self.assertEqual(portal.money_to_pesewas("0.005"), 1)
        with self.assertRaises(ValueError):
            portal.money_to_pesewas("not-money")

    def test_password_policy_requires_mixed_characters(self):
        with self.assertRaises(ValueError):
            portal.validate_password_strength("weakpassword")
        portal.validate_password_strength("Strong#2026")


if __name__ == "__main__":
    unittest.main()
