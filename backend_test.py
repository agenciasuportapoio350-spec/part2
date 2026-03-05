import requests
import json
import sys
from datetime import datetime

class RankFlowAPITester:
    def __init__(self):
        self.base_url = "https://rankflow-build.preview.emergentagent.com/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_client_id = None
        self.test_lead_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, check_response=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                response_data = {}
                try:
                    response_data = response.json() if response.text else {}
                    if check_response:
                        additional_check = check_response(response_data)
                        if not additional_check:
                            success = False
                            self.tests_passed -= 1
                            print(f"❌ Failed - Response validation failed")
                except:
                    if expected_status != 204:  # Don't expect JSON for 204 No Content
                        print("⚠️  Warning - No JSON response")
                return success, response_data
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data.get('detail', response.text[:200])}")
                    except:
                        print(f"   Error: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login and get token"""
        print("\n" + "="*60)
        print("🔐 TESTING LOGIN")
        print("="*60)
        
        success, response = self.run_test(
            "Login with admin credentials",
            "POST",
            "/auth/login",
            200,
            data={"email": "admin@rankflow.com", "password": "admin123456"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response.get('user', {})
            return True
        return False

    def test_clients_api_with_plan_field(self):
        """Test 1: API de clientes deve retornar lista sem erro 500"""
        print("\n" + "="*60)
        print("👥 TESTING CLIENTS API (with plan field)")  
        print("="*60)
        
        def check_clients_response(data):
            """Verify clients have plan field"""
            if not isinstance(data, list):
                print("❌ Response is not a list")
                return False
            
            for client in data:
                if 'plan' not in client:
                    print(f"❌ Client {client.get('name', 'Unknown')} missing plan field")
                    return False
                if client['plan'] not in ['unico', 'recorrente']:
                    print(f"❌ Client {client.get('name', 'Unknown')} has invalid plan: {client['plan']}")
                    return False
            
            print(f"✅ All {len(data)} clients have valid plan field")
            return True
        
        return self.run_test(
            "Get clients list with plan field",
            "GET", 
            "/clients",
            200,
            check_response=check_clients_response
        )

    def test_create_client_with_12_checklist_items(self):
        """Test 2: Criar cliente deve ter checklist com 12 itens corretos"""
        print("\n" + "="*60)
        print("📝 TESTING CLIENT CREATION (12 checklist items)")
        print("="*60)
        
        def check_checklist(data):
            """Verify client has 12 checklist items"""
            checklist = data.get('checklist', [])
            if len(checklist) != 12:
                print(f"❌ Expected 12 checklist items, got {len(checklist)}")
                return False
            
            expected_items = [
                "Criar perfil / Reivindicar acesso",
                "Revisão do Perfil / Editar", 
                "Coletar fotos / Imagens",
                "Primeira postagem",
                "Pedir avaliação",
                "Segunda postagem",
                "Responder avaliação",
                "Terceira postagem",
                "Quarta postagem", 
                "Responder avaliação",
                "Revisar perfil",
                "Enviar acesso ao cliente"
            ]
            
            for i, expected in enumerate(expected_items):
                if i >= len(checklist) or checklist[i]['title'] != expected:
                    print(f"❌ Checklist item {i+1} mismatch. Expected: '{expected}', Got: '{checklist[i]['title'] if i < len(checklist) else 'Missing'}'")
                    return False
                if 'id' not in checklist[i] or 'completed' not in checklist[i]:
                    print(f"❌ Checklist item {i+1} missing required fields")
                    return False
            
            print("✅ All 12 checklist items present and correct")
            return True
        
        success, response = self.run_test(
            "Create client with 12 checklist items",
            "POST",
            "/clients", 
            200,  # Backend returns 200 instead of 201
            data={
                "name": "Test Client Checklist",
                "email": "test@checklist.com",
                "plan": "recorrente"
            },
            check_response=check_checklist
        )
        
        if success and 'id' in response:
            self.test_client_id = response['id']
        
        return success, response

    def test_lead_conversion_with_plan_unico(self):
        """Test 3: Conversão de lead para cliente deve ter campo plan='unico' e 12 itens de checklist"""
        print("\n" + "="*60)
        print("🔄 TESTING LEAD CONVERSION (plan='unico' + 12 checklist)")
        print("="*60)
        
        # First create a lead
        lead_success, lead_response = self.run_test(
            "Create lead for conversion",
            "POST",
            "/leads",
            200,  # Backend returns 200 instead of 201
            data={
                "name": "Test Lead Conversion", 
                "email": "conversion@test.com",
                "stage": "novo_lead",
                "contract_value": 1000.00
            }
        )
        
        if not lead_success:
            return False, {}
        
        self.test_lead_id = lead_response['id']
        
        # Convert lead to client
        def check_conversion_result(data):
            """Verify converted client has plan='unico' and 12 checklist items"""
            if data.get('plan') != 'unico':
                print(f"❌ Expected plan='unico', got '{data.get('plan')}'")
                return False
            
            checklist = data.get('checklist', [])
            if len(checklist) != 12:
                print(f"❌ Expected 12 checklist items, got {len(checklist)}")
                return False
            
            print("✅ Lead converted with plan='unico' and 12 checklist items")
            return True
        
        return self.run_test(
            "Convert lead to client (plan=unico + 12 checklist)",
            "POST",
            f"/leads/{self.test_lead_id}/convert",
            200,  # Backend returns 200 instead of 201
            check_response=check_conversion_result
        )

    def test_weekly_checklist_automation(self):
        """Test 10: Checklist semanal deve ativar automaticamente quando todos 12 itens forem concluídos para cliente recorrente"""
        print("\n" + "="*60)
        print("🔁 TESTING WEEKLY CHECKLIST AUTOMATION")
        print("="*60)
        
        if not self.test_client_id:
            print("❌ No test client available for weekly checklist test")
            return False, {}
        
        # Get client details first
        success, client_data = self.run_test(
            "Get client details for weekly test",
            "GET",
            f"/clients/{self.test_client_id}",
            200
        )
        
        if not success:
            return False, {}
        
        checklist = client_data.get('checklist', [])
        if len(checklist) != 12:
            print(f"❌ Client should have 12 checklist items for this test")
            return False, {}
        
        # Complete all 12 checklist items
        print("Completing all 12 checklist items...")
        for i, item in enumerate(checklist):
            if not item.get('completed'):
                item_success, _ = self.run_test(
                    f"Complete checklist item {i+1}",
                    "PUT",
                    f"/clients/{self.test_client_id}/checklist/{item['id']}",
                    200
                )
                if not item_success:
                    print(f"❌ Failed to complete checklist item {i+1}")
                    return False, {}
        
        # Check if weekly tasks were activated
        def check_weekly_activation(data):
            """Check if weekly tasks were activated after completing all checklist items"""
            weekly_tasks_activated = data.get('weekly_tasks_activated', False)
            if not weekly_tasks_activated:
                print("❌ Weekly tasks were not automatically activated")
                return False
            print("✅ Weekly tasks automatically activated after completing all checklist items")
            return True
        
        # Complete the last item to trigger weekly activation
        last_item = checklist[-1]
        return self.run_test(
            "Complete final checklist item (should activate weekly)",
            "PUT", 
            f"/clients/{self.test_client_id}/checklist/{last_item['id']}",
            200,
            check_response=check_weekly_activation
        )

    def test_dashboard_stats(self):
        """Test dashboard API for basic functionality"""
        print("\n" + "="*60)
        print("📊 TESTING DASHBOARD STATS")
        print("="*60)
        
        def check_dashboard_stats(data):
            """Verify dashboard has required stats"""
            required_fields = [
                'leads_total', 'clients_count', 'tasks_today', 
                'tasks_pending', 'monthly_revenue'
            ]
            
            for field in required_fields:
                if field not in data:
                    print(f"❌ Dashboard missing field: {field}")
                    return False
            
            print("✅ Dashboard stats have all required fields")
            return True
        
        return self.run_test(
            "Get dashboard statistics",
            "GET",
            "/dashboard/stats", 
            200,
            check_response=check_dashboard_stats
        )

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n" + "="*60)
        print("🧹 CLEANING UP TEST DATA")
        print("="*60)
        
        # Delete test client
        if self.test_client_id:
            self.run_test(
                "Delete test client",
                "DELETE",
                f"/clients/{self.test_client_id}",
                200
            )
        
        # Delete test lead (if not converted)
        if self.test_lead_id:
            self.run_test(
                "Delete test lead",
                "DELETE", 
                f"/leads/{self.test_lead_id}",
                200
            )

    def run_all_tests(self):
        """Run all audit correction tests"""
        print("🚀 Starting RankFlow API Audit Tests")
        print("="*80)
        
        # 1. Login
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return 1
        
        # 2. Test clients API with plan field
        success, _ = self.test_clients_api_with_plan_field()
        if not success:
            print("❌ Clients API test failed")
        
        # 3. Test client creation with 12 checklist items
        success, _ = self.test_create_client_with_12_checklist_items()
        if not success:
            print("❌ Client creation with checklist test failed")
        
        # 4. Test lead conversion
        success, _ = self.test_lead_conversion_with_plan_unico()
        if not success:
            print("❌ Lead conversion test failed")
        
        # 5. Test weekly checklist automation
        success, _ = self.test_weekly_checklist_automation()
        if not success:
            print("❌ Weekly checklist automation test failed")
        
        # 6. Test dashboard
        success, _ = self.test_dashboard_stats()
        if not success:
            print("❌ Dashboard stats test failed")
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print final results
        print("\n" + "="*80)
        print("📊 FINAL TEST RESULTS")
        print("="*80)
        print(f"Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = RankFlowAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())