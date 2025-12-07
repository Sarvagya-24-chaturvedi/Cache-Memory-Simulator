"""
binary_store.py
----------------

Utility module to store binary representations of cache accesses.

The original desktop simulator called:

    store_binary(b_addr, b_tag, b_index, b_offset, b_data)

This module provides a compatible function and writes to a text file
(`binary_values.txt`) in the current working directory.
Each call appends one line.
"""

from __future__ import annotations

import os
from datetime import datetime

BINARY_FILE = "binary_values.txt"


def _ensure_file() -> None:
    """Ensure the binary values file exists."""
    if not os.path.exists(BINARY_FILE):
        # create empty file
        with open(BINARY_FILE, "w", encoding="utf-8") as f:
            f.write("# Binary values of cache accesses\n")


def store_binary(
    b_addr: str,
    b_tag: str,
    b_index: str,
    b_offset: str,
    b_data: str,
    seq_name: str | None = None,
) -> None:
    """
    Append one record of binary values.

    Parameters mirror the original usage:
    - b_addr  : full binary address string
    - b_tag   : binary tag bits
    - b_index : binary index bits
    - b_offset: binary offset bits
    - b_data  : binary data (e.g. 8 bits)
    - seq_name: optional human-readable sequence name or file
    """
    _ensure_file()
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    seq_part = f"{seq_name}" if seq_name else "-"
    line = f"{ts} | seq={seq_part} | addr={b_addr} tag={b_tag} idx={b_index} off={b_offset} data={b_data}\n"
    with open(BINARY_FILE, "a", encoding="utf-8") as f:
        f.write(line)


def read_binary_file() -> str:
    """
    Return the contents of the binary-values file as a single string.
    If the file does not exist, it will be created and an empty string (header only) is returned.
    """
    _ensure_file()
    with open(BINARY_FILE, "r", encoding="utf-8") as f:
        return f.read()


