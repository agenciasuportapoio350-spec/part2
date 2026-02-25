#!/usr/bin/env python3

import requests
import json
import time

# Backend URL
BACKEND_URL = "https://rankflow-1.preview.emergentagent.com/api"

def test_core_conversion():
    """Test the core conversion functionality"""
    print("🧪 Testing Core Conversion Functionality")
    print("=" * 50)
    
    # Login
    login_data = {"email": "admin@rankflow.com", "password": "admin123456"}
    response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Create lead
    timestamp = int(time.time())
    lead_data = {
        "name": f"ConversionTest_{timestamp}",
        "email": "conversion@test.com",
        "stage": "proposta",  # Start with different stage
        "contract_value": 2000
    }
    
    response = requests.post(f"{BACKEND_URL}/leads", json=lead_data, headers=headers)
    lead_id = response.json().get("id")
    print(f"✅ Lead created: {lead_data['name']}")
    
    # Count clients before
    response = requests.get(f"{BACKEND_URL}/clients", headers=headers)
    clients_before = len(response.json())
    print(f"📊 Clients before: {clients_before}")
    
    # Update to fechado
    response = requests.put(f"{BACKEND_URL}/leads/{lead_id}", 
                          json={"stage": "fechado"}, headers=headers)
    print(f"🔄 Updated lead to 'fechado'")
    
    # Count clients after
    response = requests.get(f"{BACKEND_URL}/clients", headers=headers)
    clients_after_data = response.json()
    clients_after = len(clients_after_data)
    print(f"📊 Clients after: {clients_after}")
    
    # Check if conversion happened
    conversion_worked = clients_after > clients_before
    print(f"🎯 Conversion worked: {conversion_worked}")
    
    # Find the new client
    new_client = None
    for client in clients_after_data:
        if client.get("name") == lead_data["name"]:
            new_client = client
            break
    
    if new_client:
        print(f"✅ New client found: {new_client['name']}")
        print(f"   Email matches: {new_client.get('email') == lead_data['email']}")
        print(f"   Contract value matches: {new_client.get('contract_value') == lead_data['contract_value']}")
    else:
        print("❌ New client not found")
    
    return conversion_worked and new_client is not None

if __name__ == "__main__":
    result = test_core_conversion()
    print("\n" + "=" * 50)
    if result:
        print("🎉 CORE CONVERSION: SUCCESS!")
        print("   ✅ Automatic lead-to-client conversion is working")
    else:
        print("❌ CORE CONVERSION: FAILED!")
    print("=" * 50)