#!/usr/bin/env python3
import os,sys
from pathlib import Path
binary="/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex"
config=Path(__file__).with_name("skills-disable.toml-value.txt").read_text()
os.execv(binary,[binary,"--config",config,"--config","project_doc_max_bytes=0",*sys.argv[1:]])
