"""
File text extraction utilities for TXT/PDF/DOCX
"""
from __future__ import annotations

import io
from typing import Optional


def extract_text_from_txt(data: bytes) -> str:
    return data.decode("utf-8", errors="ignore")


def extract_text_from_pdf(data: bytes) -> str:
    # Try pdfplumber first, fallback to PyPDF2
    try:
        import pdfplumber  # type: ignore

        with pdfplumber.open(io.BytesIO(data)) as pdf:
            texts = []
            for page in pdf.pages:
                texts.append(page.extract_text() or "")
        return "\n".join(texts)
    except Exception:
        try:
            from PyPDF2 import PdfReader  # type: ignore

            reader = PdfReader(io.BytesIO(data))
            texts = []
            for page in reader.pages:
                texts.append(page.extract_text() or "")
            return "\n".join(texts)
        except Exception as e:
            raise RuntimeError(f"PDF 文字提取失敗: {e}")


def extract_text_from_docx(data: bytes) -> str:
    try:
        import docx  # type: ignore

        d = docx.Document(io.BytesIO(data))
        paras = [p.text for p in d.paragraphs]
        return "\n".join(paras)
    except Exception as e:
        raise RuntimeError(f"DOCX 文字提取失敗: {e}")


def extract_text_by_mime(filename: str, content_type: Optional[str], data: bytes) -> str:
    name = (filename or "").lower()
    ct = (content_type or "").lower()
    if name.endswith(".txt") or ct.startswith("text/"):
        return extract_text_from_txt(data)
    if name.endswith(".pdf") or ct == "application/pdf":
        return extract_text_from_pdf(data)
    if name.endswith(".docx") or ct in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",):
        return extract_text_from_docx(data)
    raise ValueError("不支援的檔案格式，只支援 .txt, .pdf, .docx")

