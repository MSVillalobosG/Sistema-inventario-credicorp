"""Serialización de datetimes para la API: instantes en UTC con sufijo Z (ISO-8601)."""

from __future__ import annotations

from datetime import datetime, timezone


def format_as_utc_z_iso(dt: datetime | None) -> str | None:
    """
    Convierte a cadena ISO interpretable en JS como UTC.

    Los valores naive del proyecto se guardan como UTC (datetime.utcnow / now UTC).
    Sin el sufijo Z, muchos navegadores tratan 'YYYY-MM-DDTHH:mm:ss' como hora *local*,
    desfasando ~horas respecto al reloj del usuario.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        utc = dt.replace(tzinfo=timezone.utc)
    else:
        utc = dt.astimezone(timezone.utc)
    return utc.isoformat().replace("+00:00", "Z")
