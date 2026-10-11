"""
AskLGA voice on Modal: speech to text with the N-ATLAS ASR models published by NCAIR
(National Centre for Artificial Intelligence and Robotics, NITDA). One Whisper-small model per
language, each fine-tuned on Nigerian speech:

  en, pcm -> NCAIR1/NigerianAccentedEnglish   (Pidgin goes through the Nigerian English model)
  ha      -> NCAIR1/Hausa-ASR
  yo      -> NCAIR1/Yoruba-ASR
  ig      -> NCAIR1/Igbo-ASR

POST /transcribe?lang=ha   body: the recorded audio (webm/ogg/mp4/wav, up to 60 s)
                           header: X-ASR-Key: <ASR_KEY>
-> {"text": "...", "lang": "ha", "model": "NCAIR1/Hausa-ASR", "seconds": 4.2, "ms": 2310}

The weights are baked into the image at build time and the loaded models are captured in a
memory snapshot, so a cold start restores them instead of reloading. The container scales to
zero after two idle minutes (sized for the $1 free Modal credit). Audio is decoded in memory and never written to disk or logged.

Deploy:  modal secret create asklga-voice HF_TOKEN=... ASR_KEY=...
         modal deploy voice/modal_app.py
"""
import os
import subprocess
import time

import modal

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
# Training artefacts in the model repos that inference never reads (the optimizer alone is 1.9 GB).
SKIP = ["optimizer.pt", "rng_state*", "scheduler.pt", "training_args.bin", "trainer_state.json"]


def download_weights():
    from huggingface_hub import snapshot_download

    for m in dict.fromkeys(MODELS.values()):
        snapshot_download(m, token=os.environ["HF_TOKEN"], ignore_patterns=SKIP)


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("torch==2.6.0", extra_index_url="https://download.pytorch.org/whl/cpu")
    .pip_install("transformers==4.51.3", "huggingface_hub==0.30.2", "numpy<2.3", "fastapi[standard]==0.115.12")
    .run_function(download_weights, secrets=[modal.Secret.from_name("asklga-voice")])
    .env({"HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1"})
)

app = modal.App("asklga-voice", image=image)


@app.cls(
    cpu=2,
    memory=4096,
    timeout=120,
    scaledown_window=120,
    enable_memory_snapshot=True,
    secrets=[modal.Secret.from_name("asklga-voice")],
)
@modal.concurrent(max_inputs=4)
class Voice:
    @modal.enter(snap=True)
    def load(self):
        import threading

        from transformers import pipeline

        self.pipes = {m: pipeline("automatic-speech-recognition", model=m, device="cpu") for m in dict.fromkeys(MODELS.values())}
        self.locks = {m: threading.Lock() for m in self.pipes}

    @modal.enter(snap=False)
    def threads(self):
        import torch

        torch.set_num_threads(2)

    @modal.asgi_app()
    def web(self):
        import numpy as np
        from fastapi import FastAPI, HTTPException, Request

        api = FastAPI(title="AskLGA voice (N-ATLAS ASR)")
        key = os.environ.get("ASR_KEY", "")

        def decode(audio: bytes):
            """Any container/codec ffmpeg reads -> 16 kHz mono float32, capped at MAX_SECONDS."""
            p = subprocess.run(
                ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", "pipe:0", "-t", str(MAX_SECONDS), "-ac", "1", "-ar", str(RATE), "-f", "f32le", "pipe:1"],
                input=audio, capture_output=True, timeout=30,
            )
            if p.returncode != 0 or not p.stdout:
                raise HTTPException(status_code=415, detail="Could not read that audio.")
            return np.frombuffer(p.stdout, dtype=np.float32).copy()

        @api.get("/")
        def index():
            return {
                "service": "AskLGA voice: speech to text with N-ATLAS (NCAIR1) ASR models",
                "languages": MODELS,
                "usage": "POST /transcribe?lang=en|pcm|ha|yo|ig with the audio as the body and an X-ASR-Key header",
                "source": "https://github.com/Uthmannabeel/asklga/tree/main/voice",
            }

        @api.post("/transcribe")
        async def transcribe_raw(request: Request, lang: str = "en"):
            if not key or request.headers.get("x-asr-key") != key:
                raise HTTPException(status_code=401, detail="Missing or wrong key.")
            model_id = MODELS.get(lang)
            if not model_id:
                raise HTTPException(status_code=400, detail=f"lang must be one of {sorted(MODELS)}")
            raw = await request.body()
            if not raw:
                raise HTTPException(status_code=400, detail="Send the audio as the request body.")
            if len(raw) > MAX_BYTES:
                raise HTTPException(status_code=413, detail="Audio is larger than 3 MB.")
            started = time.time()
            from starlette.concurrency import run_in_threadpool

            def run():
                audio = decode(raw)
                seconds = len(audio) / RATE
                if seconds < 0.3:
                    raise HTTPException(status_code=400, detail="The recording is too short.")
                with self.locks[model_id]:
                    out = self.pipes[model_id]({"raw": audio, "sampling_rate": RATE}, generate_kwargs={"task": "transcribe"}, chunk_length_s=30)
                return (out.get("text") or "").strip(), seconds

            text, seconds = await run_in_threadpool(run)
            return {"text": text, "lang": lang, "model": model_id, "seconds": round(seconds, 1), "ms": int((time.time() - started) * 1000)}

        return api
