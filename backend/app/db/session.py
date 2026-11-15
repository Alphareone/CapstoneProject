"""Engine asíncrono y factoría de sesiones SQLAlchemy 2.0."""
from collections.abc import AsyncGenerator

from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    poolclass=NullPool,  # <-- ESTO APAGA EL POOL INTERNO PARA QUE PGBOUNCER TRABAJE
    connect_args={
        "prepared_statement_cache_size": 0,  # <-- ESTO EVITA EL ERROR DE ASYNCPG
        "statement_cache_size": 0
    },
    # Eliminamos pool_pre_ping=True porque no es compatible con NullPool
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependencia FastAPI que provee una sesión por request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()