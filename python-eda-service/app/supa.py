import requests
import json
from typing import Optional

class Supa:
    def __init__(self, url: str, service_key: str):
        self.url = url.rstrip("/")
        self.service_key = service_key
        self.headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
        }

    def download(self, path: str) -> Optional[bytes]:
        bucket, obj_path = path.split("/", 1)
        endpoint = f"{self.url}/storage/v1/object/{bucket}/{obj_path}"
        r = requests.get(endpoint, headers=self.headers, timeout=60)
        return r.content if r.status_code == 200 else None

    def upload(self, bucket: str, path: str, data: bytes, content_type="application/octet-stream") -> bool:
        endpoint = f"{self.url}/storage/v1/object/{bucket}/{path}"
        headers = dict(self.headers)
        headers["Content-Type"] = content_type
        r = requests.put(endpoint, headers=headers, data=data, timeout=120)
        if r.status_code not in (200, 201, 204):
            raise RuntimeError(f"Upload failed: {r.status_code} {r.text}")
        return True

    def update_report(self, report_id: str, payload: dict):
        endpoint = f"{self.url}/rest/v1/reports?id=eq.{report_id}"
        headers = dict(self.headers)
        headers.update({"Content-Type": "application/json", "Prefer": "return=representation"})
        r = requests.patch(endpoint, headers=headers, data=json.dumps(payload), timeout=30)
        if r.status_code not in (200, 204):
            raise RuntimeError(f"Failed to update report: {r.status_code} {r.text}")
        return r.json() if r.text else {}
