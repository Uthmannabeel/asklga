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

Text to speech for spoken answers, with Meta's open MMS-TTS voices (VITS, one per language,
CC BY-NC 4.0; AskLGA is non-commercial). Igbo uses a community checkpoint derived from the MMS
Igbo model, as Meta's own is no longer published:

  en  -> facebook/mms-tts-eng     pcm -> facebook/mms-tts-pcm     ha -> facebook/mms-tts-hau
  yo  -> facebook/mms-tts-yor     ig  -> Shinzmann/soro-tts-ibo

POST /speak   body: {"text": "...", "lang": "ha"}   header: X-ASR-Key: <ASR_KEY>
-> audio/wav, 16 kHz mono 16-bit; headers X-Voice-Model, X-Sample-Rate

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
VOICES = {
    "en": "facebook/mms-tts-eng",
    "pcm": "facebook/mms-tts-pcm",
    "ha": "facebook/mms-tts-hau",
    "yo": "facebook/mms-tts-yor",
    "ig": "Shinzmann/soro-tts-ibo",
}
MAX_BYTES = 3 * 1024 * 1024
MAX_SECONDS = 60
MAX_SPEECH_CHARS = 700
RATE = 16000
# Training artefacts in the model repos that inference never reads (the optimizer alone is 1.9 GB).
# The N-ATLAS weights are pytorch_model.bin files, so "*.bin" must never be in this list.
SKIP = ["optimizer.pt", "rng_state*", "scheduler.pt", "training_args.bin", "trainer_state.json"]
# The MMS voices ship safetensors as well as a duplicate .bin, plus a demo recording.
SKIP_VOICE = ["pytorch_model.bin", "*.wav"]


def download_weights():
    from huggingface_hub import snapshot_download

    for m in dict.fromkeys(MODELS.values()):
        snapshot_download(m, token=os.environ["HF_TOKEN"], ignore_patterns=SKIP)
    for m in dict.fromkeys(VOICES.values()):
        snapshot_download(m, token=os.environ["HF_TOKEN"], ignore_patterns=SKIP_VOICE)


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
    memory=6144,
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

        from transformers import VitsModel, VitsTokenizer, pipeline

        self.pipes = {m: pipeline("automatic-speech-recognition", model=m, device="cpu") for m in dict.fromkeys(MODELS.values())}
        self.locks = {m: threading.Lock() for m in self.pipes}
        self.voices = {}
        for m in dict.fromkeys(VOICES.values()):
            model = VitsModel.from_pretrained(m).eval()
            self.voices[m] = (VitsTokenizer.from_pretrained(m), model)
            self.locks[m] = threading.Lock()

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
                "service": "AskLGA voice: speech to text with N-ATLAS (NCAIR1) ASR models; text to speech with MMS-TTS (Meta) voices",
                "languages": MODELS,
                "voices": VOICES,
                "usage": "POST /transcribe?lang=en|pcm|ha|yo|ig with the audio as the body; POST /speak with {text, lang}; both need an X-ASR-Key header",
                "source": "https://github.com/Uthmannabeel/asklga/tree/main/voice",
            }

        def wav16(samples) -> bytes:
            """float32 [-1, 1] -> 16-bit mono WAV at RATE."""
            import io
            import wave

            pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2").tobytes()
            buf = io.BytesIO()
            with wave.open(buf, "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(RATE)
                w.writeframes(pcm)
            return buf.getvalue()

        @api.post("/speak")
        async def speak(request: Request):
            from fastapi import Response

            if not key or request.headers.get("x-asr-key") != key:
                raise HTTPException(status_code=401, detail="Missing or wrong key.")
            body = await request.json()
            text = str(body.get("text", "")).strip()[:MAX_SPEECH_CHARS]
            lang = str(body.get("lang", "en"))
            model_id = VOICES.get(lang)
            if not model_id:
                raise HTTPException(status_code=400, detail=f"lang must be one of {sorted(VOICES)}")
            if not text:
                raise HTTPException(status_code=400, detail="Send text to speak.")
            started = time.time()
            from starlette.concurrency import run_in_threadpool

            def run():
                import torch

                tok, model = self.voices[model_id]
                inputs = tok(text, return_tensors="pt")
                with self.locks[model_id], torch.no_grad():
                    torch.manual_seed(7)  # the flow is stochastic; a fixed seed keeps the voice steady
                    wave = model(**inputs).waveform[0].numpy()
                # Resample if a checkpoint is not at 16 kHz (MMS voices are).
                sr = int(getattr(model.config, "sampling_rate", RATE))
                if sr != RATE:
                    idx = np.linspace(0, len(wave) - 1, int(len(wave) * RATE / sr))
                    wave = np.interp(idx, np.arange(len(wave)), wave).astype("float32")
                return wav16(wave)

            data = await run_in_threadpool(run)
            return Response(
                content=data,
                media_type="audio/wav",
                headers={"X-Voice-Model": model_id, "X-Sample-Rate": str(RATE), "X-Voice-Ms": str(int((time.time() - started) * 1000))},
            )

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
