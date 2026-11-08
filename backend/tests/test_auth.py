"""Pruebas del flujo de autenticación y 2FA por correo electrónico."""
import pytest

pytestmark = pytest.mark.asyncio


async def test_register_login_2fa_flow(client, captured_email):
    # Registro -> crea un reto y programa el envío de OTP por correo.
    response = await client.post("/api/v1/auth/register", json={
        "first_name": "Max", "last_name": "Weller",
        "email": "max@wellq.co.uk", "phone": "+12015550199",
        "password": "S3cret!pass",
    })
    assert response.status_code == 200, response.text
    registration = response.json()
    assert registration["method"] == "email"
    assert captured_email and captured_email[-1]["email"] == "max@wellq.co.uk"

    challenge_id = registration["challenge_id"]
    code = captured_email[-1]["code"]
    response = await client.post("/api/v1/auth/2fa/verify", json={
        "challenge_id": challenge_id, "code": code,
    })
    assert response.status_code == 200, response.text
    tokens = response.json()
    assert tokens["access_token"] and tokens["refresh_token"]

    # El OTP verifica el correo; no debe marcar como verificado el teléfono.
    response = await client.get("/api/v1/users/me", headers={
        "Authorization": f"Bearer {tokens['access_token']}"
    })
    assert response.status_code == 200
    assert response.json()["email"] == "max@wellq.co.uk"
    assert response.json()["phone_verified"] is False

    # Login posterior genera un nuevo código por correo y vuelve a emitir tokens.
    response = await client.post("/api/v1/auth/login", json={
        "email": "max@wellq.co.uk", "password": "S3cret!pass"
    })
    assert response.status_code == 200, response.text
    login_challenge = response.json()["challenge_id"]
    assert captured_email[-1]["email"] == "max@wellq.co.uk"
    response = await client.post("/api/v1/auth/2fa/verify", json={
        "challenge_id": login_challenge, "code": captured_email[-1]["code"],
    })
    assert response.status_code == 200, response.text

    # Refresh rota el token.
    response = await client.post("/api/v1/auth/token/refresh", json={
        "refresh_token": tokens["refresh_token"]
    })
    assert response.status_code == 200, response.text
    assert response.json()["access_token"]


async def test_register_duplicate_email(client, captured_email):
    payload = {
        "first_name": "A", "last_name": "B", "email": "dup@test.com",
        "phone": "+12015550111", "password": "S3cret!pass",
    }
    assert (await client.post("/api/v1/auth/register", json=payload)).status_code == 200
    response = await client.post(
        "/api/v1/auth/register", json={**payload, "phone": "+12015550112"}
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"


async def test_login_bad_credentials(client):
    response = await client.post("/api/v1/auth/login", json={
        "email": "nope@test.com", "password": "whatever"
    })
    assert response.status_code == 401


async def test_2fa_wrong_code(client, captured_email):
    response = await client.post("/api/v1/auth/register", json={
        "first_name": "C", "last_name": "D", "email": "c@test.com",
        "phone": "+12015550133", "password": "S3cret!pass",
    })
    challenge_id = response.json()["challenge_id"]
    response = await client.post("/api/v1/auth/2fa/verify", json={
        "challenge_id": challenge_id, "code": "000000"
    })
    assert response.status_code == 400


async def test_protected_requires_token(client):
    assert (await client.get("/api/v1/users/me")).status_code == 401
