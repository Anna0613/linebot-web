"""
Recursive character-based text splitter for chunking.
Chunk size: 500-1000 (default 800), overlap: 50-100 (default 80)
"""
from __future__ import annotations

from typing import List


def _split_by_delims(text: str, delims: List[str]) -> List[str]:
    parts = [text]
    for d in delims:
        tmp: List[str] = []
        for p in parts:
            tmp.extend(p.split(d))
        parts = tmp
    return [p for p in (s.strip() for s in parts) if p]


def recursive_split(
    text: str,
    chunk_size: int = 800,
    overlap: int = 80,
) -> List[str]:
    if not text:
        return []

    # Primary splits by paragraphs, then sentences, then fallback
    paragraphs = _split_by_delims(text, ["\n\n"]) or [text]

    def assemble(pieces: List[str]) -> List[str]:
        chunks: List[str] = []
        buf: List[str] = []
        cur_len = 0
        for piece in pieces:
            pl = len(piece)
            if cur_len + pl + (1 if buf else 0) <= chunk_size:
                buf.append(piece)
                cur_len += pl + (1 if buf else 0)
            else:
                if buf:
                    chunks.append("\n".join(buf))
                # start new with overlap from previous
                if overlap > 0 and chunks:
                    prev = chunks[-1]
                    tail = prev[-overlap:]
                    buf = [tail, piece]
                    cur_len = len(tail) + pl
                else:
                    buf = [piece]
                    cur_len = pl
        if buf:
            chunks.append("\n".join(buf))
        return chunks

    # Create pieces by recursively splitting paragraphs by sentences and punctuation if needed
    pieces: List[str] = []
    for para in paragraphs:
        if len(para) <= chunk_size:
            pieces.append(para)
            continue
        # split by sentences endings common in zh/ja/en
        sent_splits = _split_by_delims(para, ["。", "！", "？", ". ", "! ", "? "])
        if sent_splits:
            for s in sent_splits:
                if len(s) <= chunk_size:
                    pieces.append(s)
                else:
                    # fallback by commas and newlines
                    finer = _split_by_delims(s, ["，", ", ", "\n"])
                    pieces.extend(finer)
        else:
            pieces.append(para)

    return assemble(pieces)

