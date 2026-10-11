---
title: AskLGA voice (N-ATLAS)
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
short_description: Speech to text for AskLGA with N-ATLAS Nigerian ASR models
---

# AskLGA voice

Speech-to-text service behind the voice button on [AskLGA](https://asklga.vercel.app), a public-interest answer service for Nigeria's 774 local governments. It runs the N-ATLAS automatic speech recognition models published by NCAIR (NITDA):

| Language | Model |
|---|---|
| Nigerian English, Pidgin | [NCAIR1/NigerianAccentedEnglish](https://huggingface.co/NCAIR1/NigerianAccentedEnglish) |
| Hausa | [NCAIR1/Hausa-ASR](https://huggingface.co/NCAIR1/Hausa-ASR) |
| Yoruba | [NCAIR1/Yoruba-ASR](https://huggingface.co/NCAIR1/Yoruba-ASR) |
| Igbo | [NCAIR1/Igbo-ASR](https://huggingface.co/NCAIR1/Igbo-ASR) |

A resident speaks a question; this service turns it into text; AskLGA answers from the council's published records with the source on every answer. Audio is decoded in memory and never stored.

`POST /transcribe?lang=en|pcm|ha|yo|ig` with the audio as the body and the `X-ASR-Key` header. Source: [github.com/Uthmannabeel/asklga/tree/main/voice](https://github.com/Uthmannabeel/asklga/tree/main/voice).
