"""
File text extraction utilities for TXT/PDF/DOCX
"""
from __future__ import annotations

import io
from typing import Optional
import re


def clean_text_for_database(text: str) -> str:
    """
    清理文字以確保與 PostgreSQL UTF-8 編碼相容

    Args:
        text: 原始文字

    Returns:
        str: 清理後的文字
    """
    if not text:
        return text

    # 移除 NULL 字節 (0x00)
    text = text.replace('\x00', '')

    # 移除其他控制字符（保留常用的換行、製表符等）
    # 移除 0x01-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F-0x9F
    text = re.sub(r'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', text)

    # 移除 Unicode 代理對字符 (0xD800-0xDFFF)
    text = re.sub(r'[\uD800-\uDFFF]', '', text)

    # 移除其他無效 Unicode 字符
    text = re.sub(r'[\uFDD0-\uFDEF\uFFFE\uFFFF]', '', text)

    return text


def extract_text_from_txt(data: bytes) -> str:
    text = data.decode("utf-8", errors="ignore")
    # 清理 NULL 字節和其他無效字符
    return clean_text_for_database(text)


def extract_text_from_pdf(data: bytes) -> str:
    """
    從 PDF 檔案提取文字，使用多種方法確保最佳相容性
    """
    import warnings
    import logging

    # 暫時抑制 pdfminer 的警告
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=UserWarning, module="pdfminer")

        # 設置 pdfminer 日誌等級為 ERROR，減少警告輸出
        pdfminer_logger = logging.getLogger('pdfminer')
        original_level = pdfminer_logger.level
        pdfminer_logger.setLevel(logging.ERROR)

        try:
            # 方法 1: 使用 pdfplumber（通常效果最好）
            try:
                import pdfplumber  # type: ignore

                with pdfplumber.open(io.BytesIO(data)) as pdf:
                    texts = []
                    for page_num, page in enumerate(pdf.pages):
                        try:
                            page_text = page.extract_text() or ""
                            texts.append(page_text)
                        except Exception as page_error:
                            # 如果單頁提取失敗，記錄但繼續處理其他頁面
                            logging.warning(f"PDF 第 {page_num + 1} 頁提取失敗: {page_error}")
                            texts.append("")

                    extracted_text = "\n".join(texts)
                    if extracted_text.strip():
                        return clean_text_for_database(extracted_text)

            except Exception as pdfplumber_error:
                logging.warning(f"pdfplumber 提取失敗，嘗試備用方法: {pdfplumber_error}")

            # 方法 2: 使用 PyPDF2 作為備用
            try:
                from PyPDF2 import PdfReader  # type: ignore

                reader = PdfReader(io.BytesIO(data))
                texts = []
                for page_num, page in enumerate(reader.pages):
                    try:
                        page_text = page.extract_text() or ""
                        texts.append(page_text)
                    except Exception as page_error:
                        logging.warning(f"PyPDF2 第 {page_num + 1} 頁提取失敗: {page_error}")
                        texts.append("")

                extracted_text = "\n".join(texts)
                if extracted_text.strip():
                    return clean_text_for_database(extracted_text)

            except Exception as pypdf2_error:
                logging.warning(f"PyPDF2 提取失敗: {pypdf2_error}")

            # 方法 3: 使用 pdfminer 直接提取（最後備用）
            try:
                from pdfminer.high_level import extract_text as pdfminer_extract

                extracted_text = pdfminer_extract(io.BytesIO(data))
                if extracted_text and extracted_text.strip():
                    return extracted_text

            except Exception as pdfminer_error:
                logging.warning(f"pdfminer 直接提取失敗: {pdfminer_error}")

            # 如果所有方法都失敗或沒有提取到文字
            raise RuntimeError("PDF 文字提取失敗：無法從檔案中提取任何文字內容")

        finally:
            # 恢復原始日誌等級
            pdfminer_logger.setLevel(original_level)


def extract_text_from_docx(data: bytes) -> str:
    try:
        import docx  # type: ignore

        d = docx.Document(io.BytesIO(data))
        paras = [p.text for p in d.paragraphs]
        text = "\n".join(paras)
        return clean_text_for_database(text)
    except Exception as e:
        raise RuntimeError(f"DOCX 文字提取失敗: {e}")


def extract_text_by_mime(filename: str, content_type: Optional[str], data: bytes) -> str:
    """
    根據檔案類型提取文字內容

    Args:
        filename: 檔案名稱
        content_type: MIME 類型
        data: 檔案二進制資料

    Returns:
        str: 提取的文字內容

    Raises:
        ValueError: 不支援的檔案格式
        RuntimeError: 文字提取失敗
    """
    name = (filename or "").lower()
    ct = (content_type or "").lower()

    try:
        if name.endswith(".txt") or ct.startswith("text/"):
            return extract_text_from_txt(data)
        elif name.endswith(".pdf") or ct == "application/pdf":
            # 使用增強的 PDF 處理器
            from app.services.enhanced_pdf_processor import extract_text_from_pdf_enhanced
            return extract_text_from_pdf_enhanced(data)
        elif name.endswith(".docx") or ct in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",):
            return extract_text_from_docx(data)
        else:
            raise ValueError("不支援的檔案格式，只支援 .txt, .pdf, .docx")
    except ValueError:
        # 重新拋出格式錯誤
        raise
    except Exception as e:
        # 包裝其他錯誤為 RuntimeError
        raise RuntimeError(f"檔案文字提取失敗: {str(e)}")

