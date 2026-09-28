"""Central Registry Document Verification Adapter with Mock Stubs."""
from datetime import datetime
from typing import Dict, Any


class MockDocumentVerificationAdapter:
    """Mock Registry Adapter for verifying citizen land records, ration cards, or utility bills."""

    @staticmethod
    def verify_document(doc_type: str, doc_number: str) -> Dict[str, Any]:
        """Simulate lookup in central state/national registry."""
        clean_num = (doc_number or "").strip().upper()
        # Mock logic: valid if length > 4 and doesn't contain 'INVALID'
        if "INVALID" in clean_num or len(clean_num) < 3:
            return {
                "verified": False,
                "confidence": 0.2,
                "registry": "Mock-State-Civil-Supplies-Registry",
                "reason": "Document identifier not matched in central registry records.",
                "checked_at": datetime.utcnow().isoformat(),
            }

        return {
            "verified": True,
            "confidence": 0.96,
            "registry": "Mock-State-Land-and-Utilities-Registry",
            "issuer": "Revenue & Municipal Administration Department",
            "status": "Active & Validated",
            "checked_at": datetime.utcnow().isoformat(),
        }
