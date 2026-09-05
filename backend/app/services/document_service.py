"""Document storage, validation, SHA-256 hashing, and text extraction service."""
import hashlib
import os
import uuid
from typing import Dict, List, Tuple, Optional
from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader
from app.core.config import settings

ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
}

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}


class DocumentService:
    @staticmethod
    def validate_file_metadata(file: UploadFile) -> str:
        """Validate filename, extension, and content type. Returns sanitized extension."""
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must have a valid filename.",
            )
        
        _, ext = os.path.splitext(file.filename.lower())
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, PNG, JPG, JPEG.",
            )

        content_type = (file.content_type or "").lower()
        if content_type and content_type not in ALLOWED_MIME_TYPES:
            # If client provides an unrecognized mime type that contradicts extension
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid MIME type '{content_type}'. Allowed types: application/pdf, image/png, image/jpeg.",
            )

        return ext

    @staticmethod
    async def save_uploaded_file(file: UploadFile) -> Dict[str, any]:
        """Validate size, compute SHA-256 hash, and securely save file to storage directory."""
        ext = DocumentService.validate_file_metadata(file)

        # Create upload directory if it does not exist
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

        stored_filename = f"{uuid.uuid4().hex}{ext}"
        storage_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

        sha256 = hashlib.sha256()
        total_size = 0

        try:
            with open(storage_path, "wb") as f:
                while chunk := await file.read(1024 * 1024):  # 1MB chunks
                    total_size += len(chunk)
                    if total_size > settings.MAX_UPLOAD_SIZE_BYTES:
                        # Clean up partial file on disk
                        f.close()
                        if os.path.exists(storage_path):
                            os.remove(storage_path)
                        raise HTTPException(
                            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024):.0f}MB.",
                        )
                    sha256.update(chunk)
                    f.write(chunk)
        except HTTPException:
            raise
        except Exception as e:
            if os.path.exists(storage_path):
                os.remove(storage_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to store uploaded document: {str(e)}",
            )

        document_hash = sha256.hexdigest()
        mime_type = file.content_type or ("application/pdf" if ext == ".pdf" else "image/jpeg")

        return {
            "original_filename": file.filename,
            "stored_filename": stored_filename,
            "storage_path": storage_path,
            "mime_type": mime_type,
            "file_size": total_size,
            "document_hash": document_hash,
        }

    @staticmethod
    def extract_text_from_pdf(storage_path: str) -> Tuple[str, List[Dict[str, any]], bool]:
        """
        Extract text from PDF using pypdf.
        Returns:
            full_text (str)
            pages_data (list of dict: [{"page_number": int, "text": str}])
            is_scanned (bool): True if minimal or no text could be extracted
        """
        if not os.path.exists(storage_path):
            raise FileNotFoundError(f"File not found: {storage_path}")

        pages_data = []
        full_text_parts = []

        try:
            reader = PdfReader(storage_path)
            num_pages = len(reader.pages)

            if num_pages == 0:
                return "", [], True

            for idx, page in enumerate(reader.pages):
                page_num = idx + 1
                page_text = page.extract_text() or ""
                trimmed = page_text.strip()
                if trimmed:
                    pages_data.append({"page_number": page_num, "text": trimmed})
                    full_text_parts.append(f"--- PAGE {page_num} ---\n{trimmed}")

            full_text = "\n\n".join(full_text_parts)
            # If total extracted text is very short (less than 40 characters), assume scanned/image PDF
            is_scanned = len(full_text.strip()) < 40

            return full_text, pages_data, is_scanned
        except Exception as e:
            # Corrupt PDF or reader error
            raise ValueError(f"Could not read PDF document: {str(e)}")

    @staticmethod
    def get_file_bytes(storage_path: str) -> bytes:
        """Read and return raw file bytes safely."""
        if not os.path.exists(storage_path):
            raise FileNotFoundError(f"Document file missing: {storage_path}")
        with open(storage_path, "rb") as f:
            return f.read()
