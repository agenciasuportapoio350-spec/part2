import requests
import sys
import time
from datetime import datetime

class RankFlowAPITester:
    def __init__(self, base_url="https://rankflow-build.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.test_results.append({
            "test": test_name,
            "passed": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, query_params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        if query_params:
            url += "?" + "&".join([f"{k}={v}" for k, v in query_params.items()])
        
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                self.log_result(name, True, f"Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                    self.log_result(name, False, f"Expected {expected_status}, got {response.status_code}: {error_detail}")
                except:
                    self.log_result(name, False, f"Expected {expected_status}, got {response.status_code}")

            return success, response.json() if response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login with admin credentials"""
        print("\n🔑 Testing Login...")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@rankflow.com", "password": "admin123456"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Login successful - Token acquired")
            return True
        print(f"❌ Login failed - No token in response")
        return False

    def create_test_lead(self):
        """Create a test lead for conversion testing"""
        test_lead_data = {
            "name": "Test Lead Conversion",
            "email": "testlead@example.com", 
            "phone": "(11) 99999-9999",
            "company": "Test Company",
            "stage": "proposta",
            "contract_value": 5000.0,
            "notes": "Lead para teste de conversão"
        }
        
        success, response = self.run_test(
            "Create Test Lead",
            "POST", 
            "leads",
            200,
            data=test_lead_data
        )
        
        if success and 'id' in response:
            return response['id']
        return None

    def test_convert_lead_recorrente(self, lead_id):
        """Test converting lead to recorrente client"""
        success, response = self.run_test(
            "Convert Lead to Recorrente Client",
            "POST",
            f"leads/{lead_id}/convert",
            200,
            query_params={"plan": "recorrente"}
        )
        
        if success and response.get('plan') == 'recorrente':
            print(f"✅ Lead converted to recorrente client successfully")
            # Check checklist has 12 items
            checklist = response.get('checklist', [])
            if len(checklist) == 12:
                print(f"✅ Checklist has correct number of items: {len(checklist)}")
                return response['id']
            else:
                print(f"❌ Incorrect checklist length: {len(checklist)}, expected 12")
        return None

    def test_convert_lead_unico(self, lead_id):
        """Test converting lead to unico client"""
        success, response = self.run_test(
            "Convert Lead to Unico Client", 
            "POST",
            f"leads/{lead_id}/convert",
            200,
            query_params={"plan": "unico"}
        )
        
        if success and response.get('plan') == 'unico':
            print(f"✅ Lead converted to unico client successfully")
            # Check checklist has 12 items
            checklist = response.get('checklist', [])
            if len(checklist) == 12:
                print(f"✅ Checklist has correct number of items: {len(checklist)}")
                return response['id']
            else:
                print(f"❌ Incorrect checklist length: {len(checklist)}, expected 12")
        return None

    def test_no_tasks_created_during_conversion(self, before_task_count, after_task_count):
        """Verify that no tasks were created during lead conversion"""
        if before_task_count == after_task_count:
            print(f"✅ No new tasks created during conversion")
            self.log_result("No Tasks Created During Conversion", True, f"Task count remained {after_task_count}")
            return True
        else:
            print(f"❌ Tasks were created during conversion: {before_task_count} -> {after_task_count}")
            self.log_result("No Tasks Created During Conversion", False, f"Task count changed: {before_task_count} -> {after_task_count}")
            return False

    def get_task_count(self):
        """Get current task count"""
        success, response = self.run_test(
            "Get Tasks Count",
            "GET",
            "tasks",
            200
        )
        if success and isinstance(response, list):
            return len(response)
        return 0

    def get_clients_by_plan(self):
        """Get clients grouped by plan"""
        success, response = self.run_test(
            "Get Clients",
            "GET", 
            "clients",
            200
        )
        
        if success and isinstance(response, list):
            clients_by_plan = {"unico": [], "recorrente": []}
            for client in response:
                plan = client.get('plan', 'unico')
                if plan in clients_by_plan:
                    clients_by_plan[plan].append(client)
            return clients_by_plan
        return {"unico": [], "recorrente": []}

def main():
    """Main test execution"""
    print("🚀 Starting RankFlow API Tests for Lead Conversion Flow\n")
    
    tester = RankFlowAPITester()
    
    # Login first
    if not tester.test_login():
        print("❌ Cannot continue without authentication")
        return 1
    
    print("\n" + "="*60)
    print("Testing Lead Conversion Functionality")
    print("="*60)
    
    # Get initial task count
    initial_task_count = tester.get_task_count()
    print(f"\n📊 Initial task count: {initial_task_count}")
    
    # Test 1: Create and convert lead to recorrente
    print("\n🧪 Test 1: Convert lead to recorrente client")
    test_lead_1 = tester.create_test_lead()
    if test_lead_1:
        recorrente_client_id = tester.test_convert_lead_recorrente(test_lead_1)
    else:
        print("❌ Failed to create test lead for recorrente conversion")
        recorrente_client_id = None
    
    # Test 2: Create and convert lead to unico 
    print("\n🧪 Test 2: Convert lead to unico client")
    test_lead_2 = tester.create_test_lead()
    if test_lead_2:
        unico_client_id = tester.test_convert_lead_unico(test_lead_2)
    else:
        print("❌ Failed to create test lead for unico conversion")
        unico_client_id = None
    
    # Test 3: Verify no tasks were created during conversion
    print("\n🧪 Test 3: Verify no tasks created during conversion")
    final_task_count = tester.get_task_count()
    tester.test_no_tasks_created_during_conversion(initial_task_count, final_task_count)
    
    # Test 4: Check clients appear in correct plan groups
    print("\n🧪 Test 4: Verify clients appear in correct plan groups")
    clients_by_plan = tester.get_clients_by_plan()
    
    recorrente_found = any(c['id'] == recorrente_client_id for c in clients_by_plan['recorrente']) if recorrente_client_id else False
    unico_found = any(c['id'] == unico_client_id for c in clients_by_plan['unico']) if unico_client_id else False
    
    if recorrente_found:
        print(f"✅ Recorrente client found in correct plan group")
        tester.log_result("Recorrente Client in Correct Group", True)
    else:
        print(f"❌ Recorrente client not found in recorrente group")
        tester.log_result("Recorrente Client in Correct Group", False)
    
    if unico_found:
        print(f"✅ Unico client found in correct plan group") 
        tester.log_result("Unico Client in Correct Group", True)
    else:
        print(f"❌ Unico client not found in unico group")
        tester.log_result("Unico Client in Correct Group", False)
    
    # Print final results
    print("\n" + "="*60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    print("="*60)
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())