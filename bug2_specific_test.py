#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime

# Backend URL
BACKEND_URL = "https://rankflow-1.preview.emergentagent.com/api"

def test_bug2_specific_flow():
    """Test the exact flow requested in the review"""
    print("🧪 Testing Bug 2 - Specific Flow from Review Request")
    print("=" * 60)
    
    # Step 1: Login
    print("1. Login: POST /api/auth/login")
    login_data = {"email": "admin@rankflow.com", "password": "admin123456"}
    response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return False
    
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print(f"✅ Login successful - Token obtained")
    
    # Step 2: Create lead with unique name
    print("\n2. Criar um lead novo com nome único")
    timestamp = int(time.time())
    lead_data = {
        "name": f"BugTest_Auto_Convert_{timestamp}",
        "email": "bugtest@test.com",
        "stage": "novo_lead",
        "contract_value": 1500
    }
    
    response = requests.post(f"{BACKEND_URL}/leads", json=lead_data, headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to create lead: {response.status_code}")
        return False
    
    lead_id = response.json().get("id")
    print(f"✅ Lead created with ID: {lead_id}")
    
    # Step 3: Count existing clients
    print("\n4. Contar quantos clientes existem: GET /api/clients")
    response = requests.get(f"{BACKEND_URL}/clients", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get clients: {response.status_code}")
        return False
    
    clients_before = len(response.json())
    print(f"✅ Clients before conversion: {clients_before}")
    
    # Step 4: Update lead to "fechado"
    print("\n5. Atualizar o lead para estágio 'fechado': PUT /api/leads/{id}")
    update_data = {"stage": "fechado"}
    response = requests.put(f"{BACKEND_URL}/leads/{lead_id}", json=update_data, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to update lead: {response.status_code}")
        return False
    
    print(f"✅ Lead updated to 'fechado' stage")
    
    # Step 5: Verify client was created
    print("\n6. Verificar se cliente foi criado: GET /api/clients")
    response = requests.get(f"{BACKEND_URL}/clients", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get clients after conversion: {response.status_code}")
        return False
    
    clients_after = response.json()
    clients_count_after = len(clients_after)
    print(f"✅ Clients after conversion: {clients_count_after}")
    
    if clients_count_after <= clients_before:
        print("❌ No new client was created automatically!")
        return False
    
    # Step 6: Verify client data matches lead data
    print("\n7. Verificar se o novo cliente tem os mesmos dados do lead")
    
    # Find the new client
    new_client = None
    for client in clients_after:
        if client.get("name") == lead_data["name"]:
            new_client = client
            break
    
    if not new_client:
        print("❌ Could not find the new client!")
        return False
    
    # Verify data matches
    print(f"   Client Name: {new_client.get('name')} (Expected: {lead_data['name']})")
    print(f"   Client Email: {new_client.get('email')} (Expected: {lead_data['email']})")
    print(f"   Client Contract Value: {new_client.get('contract_value')} (Expected: {lead_data['contract_value']})")
    print(f"   Client Lead ID Reference: {new_client.get('lead_id')} (Expected: {lead_id})")
    
    if (new_client.get("name") == lead_data["name"] and
        new_client.get("email") == lead_data["email"] and
        new_client.get("contract_value") == lead_data["contract_value"] and
        new_client.get("lead_id") == lead_id):
        print("✅ Client data matches lead data perfectly!")
        return True
    else:
        print("❌ Client data does not match lead data!")
        return False

if __name__ == "__main__":
    success = test_bug2_specific_flow()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 CONCLUSÃO: A conversão automática funcionou perfeitamente!")
        print("   ✅ Lead foi automaticamente convertido para cliente")
        print("   ✅ Dados foram transferidos corretamente")
        print("   ✅ Bug 2 está CORRIGIDO!")
    else:
        print("❌ CONCLUSÃO: A conversão automática NÃO funcionou!")
        print("   ❌ Bug 2 ainda tem problemas!")
    print("=" * 60)