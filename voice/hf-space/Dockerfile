# AskLGA voice: the four N-ATLAS speech recognition models (NCAIR1) behind one small HTTP API.
# Runs on a Hugging Face Space (Docker SDK, free CPU tier). Secrets: HF_TOKEN (gated model
# access), ASR_KEY (shared with the AskLGA server, which is the only intended caller).
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH HF_HOME=/home/user/.cache/huggingface
WORKDIR /home/user/app
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt
COPY --chown=user app.py README.md ./
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
