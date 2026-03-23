#!/bin/bash
cd "$(dirname "$0")"
export TOKENIZERS_PARALLELISM=false
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
exec python serve.py
