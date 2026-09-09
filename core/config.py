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
    # İşlem çıkarımında modelin akıl yürütme derinliği: low | medium | high.
    # medium: kategori isabeti için gerekli (low, listede olmayan kategoride kötü fallback yapıyor).
    PARSE_REASONING: str = os.environ.get("GROQ_PARSE_REASONING", "medium")
    # Aynı anda kaç Groq isteği yapılabilir (tek anahtarın RPM'ini korur). Fazlası sıraya girer.
    GROQ_MAX_ES: int = _int("GROQ_MAX_ES", 8)
    # Groq HTTP çağrı zaman aşımı (saniye).
    GROQ_TIMEOUT: float = float(os.environ.get("GROQ_TIMEOUT", "20"))

    # --- Supabase ---
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.environ.get(
        "SUPABASE_SERVICE_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    )
    SUPABASE_ANON_KEY: str = os.environ.get("SUPABASE_ANON_KEY", "")
    # Opsiyonel: verilirse JWT'ler yerelde HS256 ile doğrulanır (ağ çağrısı yok).
    SUPABASE_JWT_SECRET: str = os.environ.get("SUPABASE_JWT_SECRET", "")

    # --- Mobil API ---
    # Base üyelikte aylık AI (sesli/yazılı) kayıt tavanı. Elle işlem ekleme sınırsız.
    # Eski ad FREE_AYLIK_LIMIT env uyumu için okunur.
    BASE_AI_AYLIK: int = _int("BASE_AI_AYLIK", _int("FREE_AYLIK_LIMIT", 150))
    FREE_AYLIK_LIMIT: int = _int("FREE_AYLIK_LIMIT", 150)  # geriye dönük
    TRIAL_GUN: int = _int("TRIAL_GUN", 7)  # referans; trigger'da sabit 7
    API_CORS_ORIGINS: str = os.environ.get("API_CORS_ORIGINS", "*")
    # /v1/capture kişi başı hız limiti: PENCERE saniyede en çok İSTEK adet.
    CAPTURE_LIMIT_ISTEK: int = _int("CAPTURE_LIMIT_ISTEK", 20)
    CAPTURE_LIMIT_PENCERE: int = _int("CAPTURE_LIMIT_PENCERE", 600)
    # IP başına genel hız limiti (dakikada istek).
    IP_LIMIT_DK: int = _int("IP_LIMIT_DK", 90)
    # Dev/yönetici modu: ayarlıysa, Authorization başlığı olmayan istekler bu
    # kullanıcı id'siyle çalışır (kimlik doğrulama atlanır). PROD'DA BOŞ BIRAK.
    DEV_BYPASS_USER_ID: str = os.environ.get("DEV_BYPASS_USER_ID", "")
    # Planlı push işini (/v1/push/run) tetikleyen cron'un paylaşılan sırrı.
    CRON_SECRET: str = os.environ.get("CRON_SECRET", "")
    # RevenueCat webhook Authorization header'ı (RC dashboard'da ayarlanan bearer).
    RC_WEBHOOK_SECRET: str = os.environ.get("RC_WEBHOOK_SECRET", "")
    # RC product id → plan eşlemesi (virgülle: "pro_aylik:pro,pro_yillik:pro,base_aylik:base")
    RC_URUN_PLAN: str = os.environ.get(
        "RC_URUN_PLAN", "pro_aylik:pro,pro_yillik:pro,base_aylik:base,base_yillik:base"
    )

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
