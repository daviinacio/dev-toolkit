#!/usr/bin/env python3
"""
Extracts an OutSystems O11 module (.oml) into its parts, to study the format.
See README.md in this folder for what is known about it.

Usage:
    python3 extract_oml.py Module.oml [output-dir]

Writes to output-dir (default: ./<Module>-parts):
    header.txt   the header fields (platform/Service Studio versions, module name...)
    model.bin    the whole decompressed model
    index.tsv    one line per part: offset, size, name
    parts/       one file per part (names with "/" have it replaced by "_")
    strings/     the printable strings of each part, one per line (easier to grep)

Only the standard library is used.
"""

import os
import re
import struct
import sys
import zlib


def u32(data: bytes, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def read_header(data: bytes):
    """`OML` + u32 header length + a printable, pipe-separated header."""
    if data[:3] != b"OML":
        raise ValueError("Not an .oml file: it doesn't start with 'OML'")
    length = u32(data, 3)
    header = data[7 : 7 + length].decode("ascii")
    return header, 7 + length


def decompress_model(data: bytes, offset: int) -> bytes:
    """Everything after the header is a single raw deflate stream."""
    decompressor = zlib.decompressobj(-15)
    model = decompressor.decompress(data[offset:])
    if not decompressor.eof or decompressor.unused_data:
        raise ValueError("Unexpected data after the deflate stream")
    return model


def read_index(model: bytes):
    """
    The model starts with u32 length + an opaque block, then an index of parts:
    [u32 name length][name][u32 part size], repeated. The parts come right after
    the index, in the same order, and their sizes add up to the rest of the model.

    The index start isn't at a fixed offset (1396 in the sample), so it's found as
    the longest run of valid entries that exactly covers the rest of the model.
    """

    def run_at(p: int):
        entries = []
        while p + 8 < len(model):
            n = u32(model, p)
            if not 3 <= n <= 300:
                break
            name = model[p + 4 : p + 4 + n]
            if not re.fullmatch(rb"[\x20-\x7e]+", name):
                break
            entries.append((name.decode("ascii"), u32(model, p + 4 + n)))
            p += 8 + n
        return entries, p

    first_block_end = 4 + u32(model, 0)
    for start in range(first_block_end, min(len(model), 1_000_000)):
        entries, end = run_at(start)
        if len(entries) > 1 and sum(size for _, size in entries) == len(model) - end:
            return start, end, entries
    raise ValueError("Part index not found")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(os.path.basename(path))[0] + "-parts"
    data = open(path, "rb").read()

    header, body_offset = read_header(data)
    model = decompress_model(data, body_offset)
    index_start, index_end, entries = read_index(model)

    os.makedirs(os.path.join(out_dir, "parts"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "strings"), exist_ok=True)
    with open(os.path.join(out_dir, "header.txt"), "w") as f:
        # The last field is a large base64 blob (Service Studio UI state): keep it short
        f.write("\n".join(field if len(field) < 200 else field[:200] + "…" for field in header.split("|")))
    with open(os.path.join(out_dir, "model.bin"), "wb") as f:
        f.write(model)

    offset = index_end
    with open(os.path.join(out_dir, "index.tsv"), "w") as index:
        for name, size in entries:
            part = model[offset : offset + size]
            file_name = name.replace("/", "_")
            index.write(f"{offset}\t{size}\t{name}\n")
            with open(os.path.join(out_dir, "parts", file_name), "wb") as f:
                f.write(part)
            with open(os.path.join(out_dir, "strings", file_name + ".txt"), "w") as f:
                f.write("\n".join(s.decode("ascii") for s in re.findall(rb"[\x20-\x7e]{3,}", part)))
            offset += size

    fields = header.split("|")
    print(f"Module: {fields[6] if len(fields) > 6 else '?'}  platform {fields[0]}  Service Studio {fields[1]}")
    print(f"Model: {len(data)} bytes -> {len(model)} decompressed")
    print(f"Index: {len(entries)} parts, at {index_start}..{index_end}")
    print(f"Written to {out_dir}/")


if __name__ == "__main__":
    main()
