_SUCCESS_SIGNALS = {
    "1", "نجح", "worked", "mcha", "msha", "zwina", "khdam", "khdm",
    "ok", "okay", "yes", "iyeh", "ah", "bslama", "shukran", "merci",
    "3jbni", "perfect", "bghit", "tayyeb", "tayb",
}
_FAILURE_SIGNALS = {
    "2", "failed", "ma mchach", "mamchach", "khassar", "ma khdmch",
    "no", "la", "mzyan", "3afan", "problem", "mochkil", "khayb",
    "ma7abch", "worst",
}

def classify_feedback(text: str) -> bool | None:
    """
    Returns True = success, False = failure, None = unclear.
    """
    t = text.lower().strip()
    if any(sig in t for sig in _SUCCESS_SIGNALS):
        return True
    if any(sig in t for sig in _FAILURE_SIGNALS):
        return False
    return None   # ambiguous — store as-is, default to CLOSED_SUCCESS
