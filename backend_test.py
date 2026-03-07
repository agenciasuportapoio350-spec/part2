import requests
import sys
import time
from datetime import datetime
import json

class RankFlowAPITester:
    def __init__(self, base_url="https://rankflow-build.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.failed_tests = []
        self.created_items = {  # Track created items for cleanup
            'leads': [],
            'clients': [],
            'tasks': [],
            'payments': []
        }

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.test_results.append({
            "test": test_name,
            "passed": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        if not success:
            self.failed_tests.append(f"{test_name}: {details}")

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
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

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

    def test_operations_stats_api(self):
        """Test the /operations/stats endpoint"""
        success, response = self.run_test(
            "Operations Stats API",
            "GET",
            "operations/stats",
            200
        )
        
        if success:
            # Validate response structure
            required_fields = ['atrasados', 'pendentes_semana', 'onboarding_pendente', 'counts']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field '{field}' in operations/stats response")
                    self.log_result(f"Operations Stats - {field} field", False, f"Missing field {field}")
                    return False
                
            # Validate counts structure 
            counts = response.get('counts', {})
            count_fields = ['atrasados', 'pendentes_semana', 'onboarding_pendente']
            for field in count_fields:
                if field not in counts:
                    print(f"❌ Missing count field '{field}' in response")
                    self.log_result(f"Operations Stats - {field} count", False, f"Missing count field {field}")
                    return False

            print(f"   Atrasados: {counts.get('atrasados', 0)}")
            print(f"   Pendentes Semana: {counts.get('pendentes_semana', 0)}")
            print(f"   Onboarding Pendente: {counts.get('onboarding_pendente', 0)}")
            
            # Validate lists structure
            for field in ['atrasados', 'pendentes_semana', 'onboarding_pendente']:
                data_list = response.get(field, [])
                if isinstance(data_list, list):
                    print(f"   {field} list: {len(data_list)} items")
                else:
                    print(f"❌ {field} is not a list")
                    self.log_result(f"Operations Stats - {field} list", False, f"{field} is not a list")
                    return False
            
            return True
        return False

    def test_dashboard_stats_api(self):
        """Test the /dashboard/stats endpoint"""
        success, response = self.run_test(
            "Dashboard Stats API", 
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            print(f"   Dashboard loaded successfully")
            print(f"   Leads: {response.get('leads_total', 0)}")
            print(f"   Clients: {response.get('clients_count', 0)}")
            return True
        return False

    def test_auth_me(self):
        """Test auth/me endpoint"""
        success, response = self.run_test(
            "Auth Me",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            print(f"   User: {response.get('name', 'Unknown')} ({response.get('role', 'USER')})")
            return True
        return False

    # === CRM TESTS ===

    def test_leads_crud(self):
        """Test complete CRUD operations for leads"""
        print("\n📊 Testing CRM Lead Management...")
        
        # Create lead
        lead_data = {
            "name": "Test Lead Company",
            "email": "test@company.com",
            "phone": "+55 11 99999-9999",
            "company": "Test Corp",
            "stage": "novo_lead",
            "contract_value": 5000.0,
            "next_contact": "2024-12-31",
            "reminder": "Call tomorrow",
            "notes": "Potential client for testing"
        }
        
        success, response = self.run_test(
            "Create Lead",
            "POST", 
            "leads",
            200,
            data=lead_data
        )
        
        if not success:
            return False
            
        lead_id = response.get('id')
        if not lead_id:
            print("❌ No lead ID returned from create")
            return False
            
        self.created_items['leads'].append(lead_id)
        print(f"   ✅ Created lead with ID: {lead_id}")
        
        # Test list leads
        success, response = self.run_test(
            "List Leads",
            "GET",
            "leads",
            200
        )
        
        if not success:
            return False
            
        leads = response
        if not isinstance(leads, list):
            print("❌ Leads response is not a list")
            return False
            
        print(f"   ✅ Listed {len(leads)} leads")
        
        # Test update lead
        update_data = {
            "stage": "contato_feito",
            "notes": "Updated via API test"
        }
        
        success, response = self.run_test(
            "Update Lead",
            "PUT",
            f"leads/{lead_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   ✅ Updated lead stage to: {response.get('stage')}")
        else:
            return False
        
        # Test convert lead to client  
        success, response = self.run_test(
            "Convert Lead to Client",
            "POST",
            f"leads/{lead_id}/convert",
            200,
            query_params={"plan": "recorrente"}
        )
        
        if success:
            client_id = response.get('id')
            self.created_items['clients'].append(client_id)
            print(f"   ✅ Converted lead to client with ID: {client_id}")
        else:
            return False
        
        # Test delete lead (should work even after conversion)
        success, response = self.run_test(
            "Delete Lead",
            "DELETE",
            f"leads/{lead_id}",
            200
        )
        
        if success:
            print(f"   ✅ Deleted lead")
            self.created_items['leads'].remove(lead_id)
        else:
            return False
            
        return True

    # === CLIENTS TESTS ===

    def test_clients_crud(self):
        """Test client management and checklist"""
        print("\n👥 Testing Client Management...")
        
        # Create client
        client_data = {
            "name": "Test Client Corp",
            "email": "client@test.com",
            "phone": "+55 11 88888-8888", 
            "company": "Client Test Corp",
            "contract_value": 10000.0,
            "plan": "recorrente",
            "notes": "Test client for API validation"
        }
        
        success, response = self.run_test(
            "Create Client",
            "POST",
            "clients", 
            200,
            data=client_data
        )
        
        if not success:
            return False
            
        client_id = response.get('id')
        if not client_id:
            print("❌ No client ID returned")
            return False
            
        self.created_items['clients'].append(client_id)
        print(f"   ✅ Created client with ID: {client_id}")
        
        # Validate checklist has 12 items
        checklist = response.get('checklist', [])
        if len(checklist) != 12:
            print(f"❌ Expected 12 checklist items, got {len(checklist)}")
            return False
        print(f"   ✅ Checklist has {len(checklist)} items")
        
        # Test get single client
        success, response = self.run_test(
            "Get Client Details",
            "GET",
            f"clients/{client_id}",
            200
        )
        
        if not success:
            return False
        print(f"   ✅ Retrieved client details")
        
        # Test list all clients
        success, response = self.run_test(
            "List Clients",
            "GET", 
            "clients",
            200
        )
        
        if not success:
            return False
        print(f"   ✅ Listed {len(response)} clients")
        
        # Test checklist toggle
        first_item_id = checklist[0]['id']
        success, response = self.run_test(
            "Toggle Checklist Item",
            "PUT",
            f"clients/{client_id}/checklist/{first_item_id}",
            200
        )
        
        if success:
            print(f"   ✅ Toggled checklist item")
        else:
            return False
        
        # Test update client
        update_data = {
            "notes": "Updated via API test",
            "contract_value": 15000.0
        }
        
        success, response = self.run_test(
            "Update Client", 
            "PUT",
            f"clients/{client_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   ✅ Updated client info")
        else:
            return False
        
        return True

    # === TASKS TESTS ===

    def test_tasks_crud(self):
        """Test agenda/tasks functionality"""
        print("\n📅 Testing Agenda/Tasks...")
        
        # Create task
        task_data = {
            "title": "Test Follow-up Task",
            "description": "API test task",
            "task_type": "follow_up",
            "due_date": "2024-12-31",
            "client_id": None,
            "lead_id": None
        }
        
        success, response = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data=task_data
        )
        
        if not success:
            return False
            
        task_id = response.get('id')
        if not task_id:
            print("❌ No task ID returned")
            return False
            
        self.created_items['tasks'].append(task_id)
        print(f"   ✅ Created task with ID: {task_id}")
        
        # Test list tasks
        success, response = self.run_test(
            "List All Tasks",
            "GET",
            "tasks",
            200
        )
        
        if not success:
            return False
        print(f"   ✅ Listed {len(response)} tasks")
        
        # Test filter tasks (today)
        success, response = self.run_test(
            "Filter Tasks - Today",
            "GET", 
            "tasks",
            200,
            query_params={"filter": "today"}
        )
        
        if not success:
            return False
        print(f"   ✅ Filtered tasks for today: {len(response)} tasks")
        
        # Test filter tasks (week)
        success, response = self.run_test(
            "Filter Tasks - Week",
            "GET",
            "tasks", 
            200,
            query_params={"filter": "week"}
        )
        
        if not success:
            return False
        print(f"   ✅ Filtered tasks for week: {len(response)} tasks")
        
        # Test update task (complete)
        update_data = {
            "completed": True
        }
        
        success, response = self.run_test(
            "Mark Task Complete",
            "PUT",
            f"tasks/{task_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   ✅ Marked task as completed")
        else:
            return False
        
        return True

    # === FINANCE TESTS ===

    def test_payments_crud(self):
        """Test financial management"""
        print("\n💰 Testing Finance/Payments...")
        
        # First create a client for the payment
        if not self.created_items['clients']:
            client_data = {
                "name": "Payment Test Client",
                "email": "payment@test.com", 
                "plan": "recorrente"
            }
            
            success, response = self.run_test(
                "Create Client for Payment",
                "POST",
                "clients",
                200,
                data=client_data
            )
            
            if not success:
                return False
                
            client_id = response.get('id')
            self.created_items['clients'].append(client_id)
        else:
            client_id = self.created_items['clients'][0]
        
        # Create payment
        payment_data = {
            "client_id": client_id,
            "description": "Monthly Service Fee",
            "amount": 1500.0,
            "payment_type": "recorrente", 
            "due_date": "2024-12-31",
            "paid": False
        }
        
        success, response = self.run_test(
            "Create Payment",
            "POST",
            "payments",
            200,
            data=payment_data
        )
        
        if not success:
            return False
            
        payment_id = response.get('id')
        if not payment_id:
            print("❌ No payment ID returned")
            return False
            
        self.created_items['payments'].append(payment_id)
        print(f"   ✅ Created payment with ID: {payment_id}")
        
        # Test list payments
        success, response = self.run_test(
            "List Payments",
            "GET",
            "payments", 
            200
        )
        
        if not success:
            return False
        print(f"   ✅ Listed {len(response)} payments")
        
        # Test mark as paid
        update_data = {
            "paid": True
        }
        
        success, response = self.run_test(
            "Mark Payment as Paid",
            "PUT",
            f"payments/{payment_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   ✅ Marked payment as paid")
        else:
            return False
        
        return True

    # === CLEANUP ===

    def cleanup_created_items(self):
        """Clean up all created test items"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete payments
        for payment_id in self.created_items['payments']:
            self.run_test(
                f"Cleanup Payment {payment_id}",
                "DELETE",
                f"payments/{payment_id}",
                200
            )
            
        # Delete tasks
        for task_id in self.created_items['tasks']:
            self.run_test(
                f"Cleanup Task {task_id}",
                "DELETE", 
                f"tasks/{task_id}",
                200
            )
            
        # Delete clients
        for client_id in self.created_items['clients']:
            self.run_test(
                f"Cleanup Client {client_id}",
                "DELETE",
                f"clients/{client_id}",
                200
            )
            
        # Delete leads
        for lead_id in self.created_items['leads']:
            self.run_test(
                f"Cleanup Lead {lead_id}",
                "DELETE",
                f"leads/{lead_id}",
                200
            )
        
        print("   ✅ Cleanup completed")

def main():
    """Main comprehensive test execution for RankFlow"""
    print("🚀 Starting RankFlow Comprehensive API Tests\n")
    print("=" * 70)
    
    tester = RankFlowAPITester()
    
    # Test sequence - comprehensive system testing
    tests = [
        ("Login Authentication", tester.test_login),
        ("Auth Check", tester.test_auth_me),
        ("Dashboard Stats API", tester.test_dashboard_stats_api), 
        ("Operations Stats API", tester.test_operations_stats_api),
        ("CRM - Leads CRUD", tester.test_leads_crud),
        ("Clients Management", tester.test_clients_crud),
        ("Agenda - Tasks CRUD", tester.test_tasks_crud),
        ("Finance - Payments CRUD", tester.test_payments_crud),
    ]
    
    # Run tests
    all_passed = True
    for test_name, test_func in tests:
        if not test_func():
            all_passed = False
            if test_name == "Login Authentication":
                print("\n❌ Critical failure: Cannot continue without authentication")
                break
    
    # Cleanup 
    print("\n🧹 Running cleanup...")
    tester.cleanup_created_items()
    
    # Print final results
    print("\n" + "="*70)
    print(f"📊 API Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"  - {failure}")
    else:
        print("\n🎉 All API tests passed successfully!")
    
    print("="*70)
    
    return 0 if all_passed and tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())