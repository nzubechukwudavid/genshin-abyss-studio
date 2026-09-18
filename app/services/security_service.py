"""
Security Service for Genshin Abyss Studio.
Enforces filesystem containment, SSRF domain allowlists, and IP address validation.
"""

import os
import socket
import ipaddress
from pathlib import Path
from typing import List
from urllib.parse import urlparse
from fastapi import HTTPException

from app.core.config import (
    ALLOWED_PROXY_DOMAINS,
    get_allowed_media_roots
)


def validate_safe_media_path(path_str: str) -> Path:
    """Validates that a requested media path resides strictly within authorized directories."""
    try:
        target = Path(path_str).resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path string.")
    
    allowed_roots = get_allowed_media_roots()
    if not any(target == r or r in target.parents for r in allowed_roots):
        raise HTTPException(status_code=403, detail="Access to the specified media path is restricted.")
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Requested media file not found.")
    return target


def validate_proxy_url(url: str) -> None:
    """Guards against SSRF and open proxy abuse by validating domains and blocking private IPs."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Only HTTP/HTTPS URLs are allowed.")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Malformed URL: Missing hostname.")

    # 1. Reject direct loopback and link-local designations
    if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0", "169.254.169.254"):
        raise HTTPException(status_code=400, detail="Requests to local or link-local addresses are strictly forbidden.")

    # 2. Check if hostname is an IP literal
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise HTTPException(status_code=400, detail="Requests to private/internal IP spaces are forbidden.")
    except ValueError:
        pass

    # 3. Resolve hostname and verify resolved destination IP
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for entry in addr_info:
            ip_str = entry[4][0]
            resolved_ip = ipaddress.ip_address(ip_str)
            if resolved_ip.is_private or resolved_ip.is_loopback or resolved_ip.is_link_local:
                raise HTTPException(status_code=400, detail="Hostname resolves to restricted private address.")
    except socket.gaierror:
        pass

    # 4. Strict domain whitelist enforcement
    if hostname.lower() not in ALLOWED_PROXY_DOMAINS and not any(hostname.lower().endswith("." + d) for d in ALLOWED_PROXY_DOMAINS):
        raise HTTPException(status_code=400, detail=f"Domain '{hostname}' is not permitted for proxying.")
