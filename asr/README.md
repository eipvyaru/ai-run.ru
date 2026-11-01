# Внутренний сервис распознавания Sherpa

Сервис загружает закреплённую модель один раз, слушает только loopback, требует секрет `ASR_SERVICE_TOKEN` и принимает multipart-поле `audio`. Он не пишет транскрипты и аудио в логи. Временный входной файл удаляется при любом исходе. Порт по умолчанию `8793`; перед VPS-развёртыванием проверить занятость и реестр портов.

## Модель

Положить `encoder.int8.onnx`, `decoder.onnx`, `joiner.onnx`, `tokens.txt` из revision `a6039be7cee829a9044a69ac0ebaf1c191217c97` в каталог модели. Manifest в исходном каталоге фиксирует SHA-256. Модель не коммитить.

## Runtime

Требуется Python 3.13 и FFmpeg в PATH либо `ASR_FFMPEG_PATH`. Linux runtime установить из `requirements.lock` в отдельный venv. Пример запуска:

```sh
python -m pip install --requirement asr/requirements.lock
ASR_MODEL_DIR=/var/lib/ai-run.ru/asr/models/gigaam-v3-punct \
ASR_TEMP_DIR=/var/cache/ai-run.ru/asr \
ASR_SERVICE_TOKEN='(32+ random characters)' \
ASR_FFMPEG_PATH=/usr/bin/ffmpeg \
python -m uvicorn asr.service:app --host 127.0.0.1 --port 8793 --workers 1
```

Лимиты: максимум 8 MiB входа, 60 секунд mono PCM 16 kHz, один decode и очередь максимум два ожидающих запроса. Проверить `/health` и `/ready`. API не открывать в Nginx.

## Локальная проверка

С `sherpa-onnx==1.13.8` и четырьмя файлами модели импортировать `_load_model`, затем вызвать `_transcribe` на `test_wavs/example.wav` с установленным FFmpeg. Не считать sample эталоном WER.
