#!/usr/bin/env python3
"""
Test the specific bug 2 behavior - investigating the manual conversion endpoint
"""

import requests
import json
import os

# Configuration
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://rankflow-1.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
TEST_EMAIL = "admin@rankflow.com"
TEST_PASSWORD = "admin123456"

def get_auth_token():
    """Get authentication token"""
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    response = requests.post(f"{API_BASE}/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def test_manual_conversion():
    """Test the manual conversion endpoint"""
    token = get_auth_token()
    if not token:
        print("Failed to authenticate")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a lead
    lead_data = {
        "name": "Test Manual Conversion",
        "email": "test.manual@example.com",
        "phone": "+55 11 99999-0000",
        "company": "Test Company",
        "stage": "proposta",
        "contract_value": 1000.00
    }
    
    response = requests.post(f"{API_BASE}/leads", json=lead_data, headers=headers)
    if response.status_code != 200:
        print(f"Failed to create lead: {response.text}")
        return
    
    lead = response.json()
    lead_id = lead.get("id")
    print(f"Created lead ID: {lead_id}")
    
    # Try manual conversion endpoint
    response = requests.post(f"{API_BASE}/leads/{lead_id}/convert", headers=headers)
    print(f"Manual conversion response: {response.status_code}")
    if response.status_code == 200:
        client = response.json()
        print(f"Manual conversion successful - Client ID: {client.get('id')}")
        print(f"Client name: {client.get('name')}")
        return True
    else:
        print(f"Manual conversion failed: {response.text}")
        return False

if __name__ == "__main__":
    test_manual_conversion()