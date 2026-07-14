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
        users = portal.load_user_store()
        owner = portal.find_user_by_email(users, OWNER_EMAIL)
        owner["forcePasswordChange"] = False
        portal.save_user_store(users)
        portal.save_password_store({
            OWNER_EMAIL: portal.hash_password_for_storage(OWNER_PASSWORD),
        })
        portal.atomic_write_json(portal.SESSIONS_STORE_PATH, {})
        portal.atomic_write_json(portal.AGENT_SETUP_TOKENS_PATH, {})
        portal.atomic_write_json(portal.AUDIT_LOGS_STORE_PATH, [])
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
        staff = portal.find_user_by_email(users, "dquarshie@bawjiasecommunitybank.com")
        staff["forcePasswordChange"] = True
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
        backup = self.client.get("/api/backup/export")
        self.assertEqual(backup.status_code, 200)
        stores = backup.get_json()["stores"]
        self.assertNotIn("sessions", stores)
        self.assertNotIn("presence", stores)

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
