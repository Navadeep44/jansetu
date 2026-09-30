"""Central configuration. Every external provider is OPTIONAL: with no keys set,
JanSetu runs fully offline using rule-based multilingual NLP so the demo never breaks."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "JanSetu"
    environment: str = "development"
    database_url: str = "sqlite:///./jansetu.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    household_salt: str = "change-me-in-production"
    auth_secret: str = "change-this-secret-in-production"
    allow_role_header: bool = False  # tests / local scripts only

    # Deployment node identity (federated: one instance per country)
    node_country: str = "ALL"  # "IN", "BR", "ZA" ... or "ALL" for the multi-country demo node

    # LLM provider: none | openai | anthropic | gemini  (openai also covers any
    # OpenAI-compatible server: Groq, Together, Ollama, vLLM, Sarvam, etc.)
    llm_provider: str = "none"
    llm_model: str = "gpt-4o-mini"
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""

    # Speech-to-text: none | openai (Whisper) | bhashini
    asr_provider: str = "none"
    asr_model: str = "whisper-1"

    # Bhashini (India's national language AI platform, ULCA pipeline API)
    bhashini_user_id: str = ""
    bhashini_api_key: str = ""
    bhashini_pipeline_id: str = "64392f96daac500b55c543cd"

    # Messaging channels (all optional)
    telegram_bot_token: str = ""
    whatsapp_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_verify_token: str = "jansetu-verify"
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    public_base_url: str = "http://localhost:8000"

    # Privacy for the BRICS federated layer
    k_anonymity: int = 5
    dp_epsilon: float = 0.0  # 0 disables differential-privacy noise

    # Approximate FX for cross-country comparison (illustrative, update from a feed in prod)
    fx_inr_usd: float = 0.0115
    fx_brl_usd: float = 0.18
    fx_zar_usd: float = 0.055

    @property
    def llm_enabled(self) -> bool:
        if self.llm_provider == "none":
            return False
        # local OpenAI-compatible servers (Ollama / vLLM) need no key
        return bool(self.llm_api_key) or "localhost" in self.llm_base_url or "127.0.0.1" in self.llm_base_url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
