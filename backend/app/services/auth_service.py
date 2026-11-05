"""Lógica de apoyo para autenticación, 2FA y tokens."""
import hashlib
import secrets
import os
import urllib.request
import json
from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import OtpChallenge, PasswordResetToken, RefreshToken


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def mask_phone(phone: str | None) -> str | None:
    """Enmascara un teléfono E.164 -> '+1 (201) •••-0199'."""
    if not phone:
        return None
    digits = phone.lstrip("+")
    if len(digits) < 4:
        return "•••"
    last4 = digits[-4:]
    if digits.startswith("1") and len(digits) == 11:
        area = digits[1:4]
        return f"+1 ({area}) •••-{last4}"
    return f"+{digits[:2]}••••{last4}"


def send_email_otp(to_email: str, code: str) -> None:
    """Envía el código usando Resend API (vía HTTPS puerto 443 para evitar bloqueos en Render)."""
    resend_api_key = os.getenv("RESEND_API_KEY")

    if not resend_api_key:
        print(f"[EMAIL-STUB] (Falta RESEND_API_KEY) Para {to_email}: Tu código ClearBid es {code}")
        print(f"[EMAIL-FALLBACK] Código para {to_email}: {code}")
        return

    try:
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {resend_api_key}",
            "Content-Type": "application/json"
        }
        
        # Resend permite enviar desde 'onboarding@resend.dev' durante pruebas
        payload = {
            "from": "ClearBid NJ <onboarding@resend.dev>",
            "to": [to_email],
            "subject": f"Código de verificación ClearBid NJ: {code}",
            "html": f"<p>Hola,</p><p>Tu código de verificación para ClearBid NJ es: <strong>{code}</strong></p><p>Caduca en 5 minutos.</p>"
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status in (200, 201):
                print(f"[EMAIL-SUCCESS] Correo enviado exitosamente vía Resend API a {to_email}")
            else:
                print(f"[EMAIL-ERROR] Resend API respondió con estado {response.status}")
    except Exception as e:
        print(f"[EMAIL-ERROR] Fallo al enviar correo vía Resend API a {to_email}: {e}")
        print(f"[EMAIL-FALLBACK] Código para {to_email}: {code}")


async def create_otp_challenge(
    db: AsyncSession,
    user,
    purpose: str = "login",
    pending_phone: str | None = None,
    background_tasks: BackgroundTasks | None = None
) -> tuple[OtpChallenge, str]:
    """Crea un reto OTP, lo persiste y envía el código por correo electrónico."""
    code = "".join(secrets.choice("0123456789") for _ in range(settings.OTP_LENGTH))
    challenge = OtpChallenge(
        user_id=user.id,
        code_hash=_sha256(code),
        purpose=purpose,
        method="email",
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.OTP_EXPIRE_SECONDS),
        pending_phone=pending_phone,
    )
    db.add(challenge)
    await db.flush()

    target_email = getattr(user, "email", None)
    if target_email:
        if background_tasks:
            background_tasks.add_task(send_email_otp, target_email, code)
        else:
            send_email_otp(target_email, code)

    return challenge, code


async def resend_otp(
    db: AsyncSession,
    challenge: OtpChallenge,
    user,
    background_tasks: BackgroundTasks | None = None
) -> None:
    """Regenera el código de un reto existente y lo reenvía por correo."""
    code = "".join(secrets.choice("0123456789") for _ in range(settings.OTP_LENGTH))
    challenge.code_hash = _sha256(code)
    challenge.attempts = 0
    challenge.expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=settings.OTP_EXPIRE_SECONDS
    )
    
    target_email = getattr(user, "email", None)
    if target_email:
        if background_tasks:
            background_tasks.add_task(send_email_otp, target_email, code)
        else:
            send_email_otp(target_email, code)


def verify_otp_code(challenge: OtpChallenge, code: str) -> str:
    """Valida un código contra el reto. Devuelve 'ok' | 'expired' | 'invalid'."""
    now = datetime.now(timezone.utc)
    expires = challenge.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if challenge.consumed or now > expires:
        return "expired"
    if challenge.attempts >= settings.OTP_MAX_ATTEMPTS:
        return "expired"
    if challenge.code_hash != _sha256(code):
        challenge.attempts += 1
        return "invalid"
    return "ok"


async def issue_refresh_token(db: AsyncSession, user_id: str) -> RefreshToken:
    """Crea y persiste un refresh token, devolviendo el registro (con jti)."""
    token = RefreshToken(
        user_id=user_id,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(token)
    await db.flush()
    return token


async def create_password_reset(db: AsyncSession, user_id: str) -> str:
    """Crea un token de restablecimiento y devuelve el valor en claro."""
    raw = "prt_" + secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user_id,
            token_hash=_sha256(raw),
            expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
        )
    )
    return raw


async def find_valid_reset(db: AsyncSession, raw_token: str) -> PasswordResetToken | None:
    res = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == _sha256(raw_token),
            PasswordResetToken.used.is_(False),
        )
    )
    prt = res.scalar_one_or_none()
    if prt is None:
        return None
    expires = prt.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        return None
    return prt