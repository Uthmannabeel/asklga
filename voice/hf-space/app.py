"""
AskLGA voice service: speech to text with the N-ATLAS ASR models published by NCAIR
(National Centre for Artificial Intelligence and Robotics, NITDA). One Whisper-small model per
language, each fine-tuned on Nigerian speech:

  en, pcm -> NCAIR1/NigerianAccentedEnglish   (Pidgin goes through the Nigerian English model)
  ha      -> NCAIR1/Hausa-ASR
  yo      -> NCAIR1/Yoruba-ASR
  ig      -> NCAIR1/Igbo-ASR

POST /transcribe?lang=ha   body: the recorded audio (webm/ogg/mp4/wav, up to 60 s)
                           header: X-ASR-Key: <ASR_KEY>
-> {"text": "...", "lang": "ha", "model": "NCAIR1/Hausa-ASR", "seconds": 4.2, "ms": 2310}

Audio is decoded in memory and never written to disk or logged.
"""
import os
import subprocess
import threading
import time

import numpy as np
import torch
from fastapi import FastAPI, HTTPException, Request
from transformers import pipeline

MODELS = {
    "en": "NCAIR1/NigerianAccentedEnglish",
    "pcm": "NCAIR1/NigerianAccentedEnglish",
    "ha": "NCAIR1/Hausa-ASR",
    "yo": "NCAIR1/Yoruba-ASR",
    "ig": "NCAIR1/Igbo-ASR",
}
MAX_BYTES = 3 * 1024 * 1024
MAX_SECONDS = 60
RATE = 16000
KEY = os.environ.get("ASR_KEY", "")
TOKEN = os.environ.get("HF_TOKEN")

torch.set_num_threads(max(1, os.cpu_count() or 1))
app = FastAPI(title="AskLGA voice (N-ATLAS ASR)")
_pipes: dict = {}
_locks = {m: threading.Lock() for m in set(MODELS.values())}
_load_lock = threading.Lock()


def get_pipe(model_id: str):
    with _load_lock:
        if model_id not in _pipes:
            _pipes[model_id] = pipeline("automatic-speech-recognition", model=model_id, token=TOKEN, device="cpu")
        return _pipes[model_id]


def preload():
    # Load every model once at boot so the first resident does not wait for a download.
    for m in dict.fromkeys(MODELS.values()):
        try:
            get_pipe(m)
            print(f"[voice] loaded {m}", flush=True)
        except Exception as e:  # keep serving the models that did load
            print(f"[voice] failed to load {m}: {e}", flush=True)


threading.Thread(target=preload, daemon=True).start()


def decode(audio: bytes) -> np.ndarray:
    """Any container/codec ffmpeg reads -> 16 kHz mono float32, capped at MAX_SECONDS."""
    p = subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", "pipe:0", "-t", str(MAX_SECONDS), "-ac", "1", "-ar", str(RATE), "-f", "f32le", "pipe:1"],
        input=audio, capture_output=True, timeout=30,
    )
    if p.returncode != 0 or not p.stdout:
        raise HTTPException(status_code=415, detail="Could not read that audio.")
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


@app.get("/")
def index():
    return {
        "service": "AskLGA voice: speech to text with N-ATLAS (NCAIR1) ASR models",
        "languages": MODELS,
        "loaded": sorted(_pipes.keys()),
        "usage": "POST /transcribe?lang=en|pcm|ha|yo|ig with the audio as the body and an X-ASR-Key header",
        "source": "https://github.com/Uthmannabeel/asklga/tree/main/voice",
    }


@app.get("/health")
def health():
    return {"ok": True, "loaded": len(_pipes), "models": len(set(MODELS.values()))}


@app.post("/transcribe")
async def transcribe(request: Request, lang: str = "en"):
    if not KEY or request.headers.get("x-asr-key") != KEY:
        raise HTTPException(status_code=401, detail="Missing or wrong key.")
    model_id = MODELS.get(lang)
    if not model_id:
        raise HTTPException(status_code=400, detail=f"lang must be one of {sorted(MODELS)}")
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Send the audio as the request body.")
    if len(body) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Audio is larger than 3 MB.")
    started = time.time()
    audio = decode(body)
    seconds = len(audio) / RATE
    if seconds < 0.3:
        raise HTTPException(status_code=400, detail="The recording is too short.")
    pipe = get_pipe(model_id)
    with _locks[model_id]:
        out = pipe({"raw": audio, "sampling_rate": RATE}, generate_kwargs={"task": "transcribe"}, chunk_length_s=30)
    text = (out.get("text") or "").strip()
    return {"text": text, "lang": lang, "model": model_id, "seconds": round(seconds, 1), "ms": int((time.time() - started) * 1000)}
