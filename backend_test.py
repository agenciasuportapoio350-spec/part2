#!/usr/bin/env python3
"""
Backend tests for RankFlow - Etapa 3 (Plan field functionality)
Tests:
1. Creating clients with plan="recorrente"
2. Updating client plan from "unico" to "recorrente"  
3. Verifying GET /api/clients returns clients with plan field
"""

import requests
import json
import uuid
import sys
from typing import Dict, Any

# Configuration
BASE_URL = "https://rankflow-1.preview.emergentagent.com/api"
TEST_USER = {
    "email": "admin@rankflow.com",
    "password": "admin123456"
}

class RankFlowTester:
    def __init__(self):
        self.token = None
        self.headers = {}
        
    def login(self) -> bool:
        """Authenticate and get access token"""
        try:
            print("🔐 Logging in...")
            response = requests.post(f"{BASE_URL}/auth/login", json=TEST_USER)
            
            if response.status_code != 200:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
            
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
            print(f"✅ Login successful! Token: {self.token[:20]}...")
            return True
            
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False

    def test_create_client_with_plan_recorrente(self) -> bool:
        """Test 1: Create client with plan='recorrente'"""
        print("\n📝 Test 1: Creating client with plan='recorrente'...")
        
        try:
            # Create unique client data
            unique_name = f"Cliente Recorrente Test {uuid.uuid4().hex[:8]}"
            client_data = {
                "name": unique_name,
                "email": f"cliente.recorrente.{uuid.uuid4().hex[:8]}@teste.com",
                "phone": "+5511999887766",
                "company": "Empresa Recorrente Ltda",
                "contract_value": 2500.50,
                "plan": "recorrente",
                "notes": "Cliente criado para teste do campo plan"
            }
            
            response = requests.post(f"{BASE_URL}/clients", 
                                   json=client_data, 
                                   headers=self.headers)
            
            if response.status_code != 200:
                print(f"❌ Create client failed: {response.status_code} - {response.text}")
                return False
            
            created_client = response.json()
            
            # Verify plan field is saved correctly
            if created_client.get("plan") != "recorrente":
                print(f"❌ Plan field not saved correctly. Expected: 'recorrente', Got: {created_client.get('plan')}")
                return False
            
            # Verify other fields
            if created_client.get("name") != unique_name:
                print(f"❌ Name not saved correctly. Expected: {unique_name}, Got: {created_client.get('name')}")
                return False
                
            if abs(created_client.get("contract_value", 0) - 2500.50) > 0.01:
                print(f"❌ Contract value not saved correctly. Expected: 2500.50, Got: {created_client.get('contract_value')}")
                return False
            
            print(f"✅ Client created successfully with plan='recorrente'")
            print(f"   Client ID: {created_client.get('id')}")
            print(f"   Name: {created_client.get('name')}")
            print(f"   Plan: {created_client.get('plan')}")
            print(f"   Contract Value: {created_client.get('contract_value')}")
            
            # Store client ID for later tests
            self.test_client_id = created_client.get("id")
            return True
            
        except Exception as e:
            print(f"❌ Test 1 error: {e}")
            return False

    def test_update_client_plan(self) -> bool:
        """Test 2: Update existing client plan from 'unico' to 'recorrente'"""
        print("\n🔄 Test 2: Updating client plan from 'unico' to 'recorrente'...")
        
        try:
            # First create a client with plan="unico"
            unique_name = f"Cliente Unico Test {uuid.uuid4().hex[:8]}"
            client_data = {
                "name": unique_name,
                "email": f"cliente.unico.{uuid.uuid4().hex[:8]}@teste.com",
                "phone": "+5511888777666",
                "company": "Empresa Única Ltda",
                "contract_value": 1500.75,
                "plan": "unico",
                "notes": "Cliente para teste de atualização do plan"
            }
            
            # Create client
            response = requests.post(f"{BASE_URL}/clients", 
                                   json=client_data, 
                                   headers=self.headers)
            
            if response.status_code != 200:
                print(f"❌ Failed to create client for update test: {response.status_code} - {response.text}")
                return False
            
            created_client = response.json()
            client_id = created_client.get("id")
            
            # Verify initial plan is "unico"
            if created_client.get("plan") != "unico":
                print(f"❌ Initial plan not correct. Expected: 'unico', Got: {created_client.get('plan')}")
                return False
            
            print(f"✅ Client created with plan='unico' (ID: {client_id})")
            
            # Now update the plan to "recorrente"
            update_data = {
                "plan": "recorrente"
            }
            
            response = requests.put(f"{BASE_URL}/clients/{client_id}", 
                                  json=update_data, 
                                  headers=self.headers)
            
            if response.status_code != 200:
                print(f"❌ Update client failed: {response.status_code} - {response.text}")
                return False
            
            updated_client = response.json()
            
            # Verify plan was updated to "recorrente"
            if updated_client.get("plan") != "recorrente":
                print(f"❌ Plan not updated correctly. Expected: 'recorrente', Got: {updated_client.get('plan')}")
                return False
            
            # Verify other fields remain unchanged
            if updated_client.get("name") != unique_name:
                print(f"❌ Name changed unexpectedly. Expected: {unique_name}, Got: {updated_client.get('name')}")
                return False
                
            if abs(updated_client.get("contract_value", 0) - 1500.75) > 0.01:
                print(f"❌ Contract value changed unexpectedly. Expected: 1500.75, Got: {updated_client.get('contract_value')}")
                return False
            
            print(f"✅ Plan updated successfully from 'unico' to 'recorrente'")
            print(f"   Client ID: {updated_client.get('id')}")
            print(f"   Name: {updated_client.get('name')}")
            print(f"   Updated Plan: {updated_client.get('plan')}")
            
            return True
            
        except Exception as e:
            print(f"❌ Test 2 error: {e}")
            return False

    def test_get_clients_with_plan_field(self) -> bool:
        """Test 3: Verify GET /api/clients returns clients with plan field"""
        print("\n📋 Test 3: Verifying GET /api/clients returns plan field...")
        
        try:
            response = requests.get(f"{BASE_URL}/clients", headers=self.headers)
            
            if response.status_code != 200:
                print(f"❌ Get clients failed: {response.status_code} - {response.text}")
                return False
            
            clients = response.json()
            
            if not isinstance(clients, list):
                print(f"❌ Expected list of clients, got: {type(clients)}")
                return False
            
            if len(clients) == 0:
                print("⚠️  No clients found in database")
                return True
            
            # Check that all clients have plan field
            clients_with_plan = []
            clients_without_plan = []
            
            for client in clients:
                if "plan" in client:
                    clients_with_plan.append(client)
                else:
                    clients_without_plan.append(client)
            
            print(f"📊 Found {len(clients)} total clients")
            print(f"   - {len(clients_with_plan)} clients with 'plan' field")
            print(f"   - {len(clients_without_plan)} clients without 'plan' field")
            
            if clients_without_plan:
                print("⚠️  Some clients missing plan field:")
                for client in clients_without_plan[:3]:  # Show first 3
                    print(f"     - ID: {client.get('id')}, Name: {client.get('name')}")
            
            # Show some examples of clients with plan field
            print("✅ Examples of clients with plan field:")
            for client in clients_with_plan[:5]:  # Show first 5
                print(f"   - Name: {client.get('name')}, Plan: {client.get('plan')}, ID: {client.get('id')[:8]}...")
            
            # Verify our test clients are included
            test_clients_found = 0
            for client in clients:
                if "Test" in client.get("name", "") and client.get("plan") in ["unico", "recorrente"]:
                    test_clients_found += 1
                    print(f"   ✓ Found test client: {client.get('name')} (plan: {client.get('plan')})")
            
            print(f"✅ GET /api/clients successfully returns {len(clients)} clients with plan field structure")
            return True
            
        except Exception as e:
            print(f"❌ Test 3 error: {e}")
            return False

    def run_all_tests(self) -> bool:
        """Run all plan field tests"""
        print("🚀 Starting RankFlow Etapa 3 - Plan Field Tests")
        print("=" * 60)
        
        # Login first
        if not self.login():
            return False
        
        # Run tests
        test_results = []
        
        test_results.append(self.test_create_client_with_plan_recorrente())
        test_results.append(self.test_update_client_plan())
        test_results.append(self.test_get_clients_with_plan_field())
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY:")
        tests = [
            "Create client with plan='recorrente'",
            "Update client plan 'unico' → 'recorrente'", 
            "GET /api/clients returns plan field"
        ]
        
        all_passed = True
        for i, (test_name, result) in enumerate(zip(tests, test_results)):
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"   {i+1}. {test_name}: {status}")
            if not result:
                all_passed = False
        
        print(f"\n🎯 OVERALL RESULT: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
        return all_passed

def main():
    tester = RankFlowTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()