"""Tüm ortam değişkenleri tek yerde. `.env` yerelde opsiyonel olarak yüklenir."""
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        return default


class Settings:
    # --- Telegram ---
    TELEGRAM_TOKEN: str = os.environ.get("TELEGRAM_TOKEN", "")
    IZIN_VERILEN_KULLANICI_ID: int = _int("IZIN_VERILEN_KULLANICI_ID", 0)

    # --- Groq ---
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
    PARSE_MODEL: str = os.environ.get("GROQ_PARSE_MODEL", "openai/gpt-oss-120b")
    TRANSCRIBE_MODEL: str = os.environ.get("GROQ_TRANSCRIBE_MODEL", "whisper-large-v3")

    # --- Supabase ---
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.environ.get(
        "SUPABASE_SERVICE_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    )
    SUPABASE_ANON_KEY: str = os.environ.get("SUPABASE_ANON_KEY", "")
    # Opsiyonel: verilirse JWT'ler yerelde HS256 ile doğrulanır (ağ çağrısı yok).
    SUPABASE_JWT_SECRET: str = os.environ.get("SUPABASE_JWT_SECRET", "")

    # --- Mobil API ---
    FREE_AYLIK_LIMIT: int = _int("FREE_AYLIK_LIMIT", 50)
    API_CORS_ORIGINS: str = os.environ.get("API_CORS_ORIGINS", "*")
    # Dev/yönetici modu: ayarlıysa, Authorization başlığı olmayan istekler bu
    # kullanıcı id'siyle çalışır (kimlik doğrulama atlanır). PROD'DA BOŞ BIRAK.
    DEV_BYPASS_USER_ID: str = os.environ.get("DEV_BYPASS_USER_ID", "")
    # Planlı push işini (/v1/push/run) tetikleyen cron'un paylaşılan sırrı.
    CRON_SECRET: str = os.environ.get("CRON_SECRET", "")

    # --- Hata izleme ---
    SENTRY_DSN: str = os.environ.get("SENTRY_DSN", "")

    # --- Sunucu / keepalive ---
    PORT: int = _int("PORT", 10000)
    RENDER_URL: str = os.environ.get("RENDER_URL", "")

    # --- Zaman dilimi ---
    TIMEZONE: str = os.environ.get("TZ", "Europe/Istanbul")

    # --- Akıllı onay eşikleri (tip başına, ₺) ---
    REVIEW_TUTAR_KISISEL: float = _float("REVIEW_TUTAR_KISISEL", 3000.0)
    REVIEW_TUTAR_ISLETME: float = _float("REVIEW_TUTAR_ISLETME", 25000.0)
    REVIEW_TUTAR_YATIRIM: float = _float("REVIEW_TUTAR_YATIRIM", 50000.0)

    def eksikler(self) -> list[str]:
        """Zorunlu değişkenlerden boş olanları döndürür."""
        zorunlu = {
            "TELEGRAM_TOKEN": self.TELEGRAM_TOKEN,
            "GROQ_API_KEY": self.GROQ_API_KEY,
            "SUPABASE_URL": self.SUPABASE_URL,
            "SUPABASE_SERVICE_KEY": self.SUPABASE_SERVICE_KEY,
        }
        return [ad for ad, deger in zorunlu.items() if not deger]


settings = Settings()
