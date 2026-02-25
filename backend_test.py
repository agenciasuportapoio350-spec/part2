#!/usr/bin/env python3
"""
RankFlow Backend Bug Testing

Testing 4 specific bugs:
1. Bug 1 - Moeda BRL: contract_value saves as number correctly
2. Bug 2 - Fechado → Cliente: Lead stage change to "fechado" creates client
3. Bug 3 - Tarefas do dia: Tasks with today's due_date appear in dashboard stats
4. Bug 4 - Datas: Payment dates are saved/returned correctly as "YYYY-MM-DD"
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os

# Configuration
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://rankflow-1.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
TEST_EMAIL = "admin@rankflow.com"
TEST_PASSWORD = "admin123456"

# Global token for authenticated requests
auth_token = None

def print_test_result(test_name, passed, details=""):
    """Print formatted test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"   {details}")
    print()

def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request with proper error handling"""
    url = f"{API_BASE}{endpoint}"
    
    if headers is None:
        headers = {}
    
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == 'POST':
            headers["Content-Type"] = "application/json"
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method.upper() == 'PUT':
            headers["Content-Type"] = "application/json"
            response = requests.put(url, json=data, headers=headers, timeout=30)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print(f"[{method.upper()}] {url} -> {response.status_code}")
        if data:
            print(f"   Request: {json.dumps(data, indent=2)}")
        
        if response.status_code >= 400:
            print(f"   Error: {response.text}")
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Request failed: {e}")
        return None

def test_authentication():
    """Test authentication and get token"""
    global auth_token
    
    print("=== Testing Authentication ===")
    
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    response = make_request("POST", "/auth/login", login_data)
    
    if response and response.status_code == 200:
        data = response.json()
        auth_token = data.get("access_token")
        print_test_result("Authentication", True, f"Token received for user: {data.get('user', {}).get('email')}")
        return True
    else:
        print_test_result("Authentication", False, "Failed to login")
        return False

def test_bug_1_brl_currency():
    """Bug 1: Test that contract_value saves correctly as number (BRL currency)"""
    print("=== Testing Bug 1: BRL Currency Contract Value ===")
    
    # Create lead with contract_value
    lead_data = {
        "name": "João Silva",
        "email": "joao.silva@empresa.com",
        "phone": "+55 11 99999-9999",
        "company": "Empresa Silva Ltda",
        "stage": "novo_lead",
        "contract_value": 2500.75,  # Test decimal value
        "notes": "Lead para teste de valor de contrato em BRL"
    }
    
    response = make_request("POST", "/leads", lead_data)
    
    if not response or response.status_code != 200:
        print_test_result("Bug 1 - Create Lead", False, "Failed to create lead")
        return False
    
    created_lead = response.json()
    lead_id = created_lead.get("id")
    
    # Verify that contract_value is saved as number, not string
    stored_value = created_lead.get("contract_value")
    expected_value = 2500.75
    
    if isinstance(stored_value, (int, float)) and stored_value == expected_value:
        print_test_result("Bug 1 - Contract Value Type", True, f"Value {stored_value} stored as {type(stored_value).__name__}")
    else:
        print_test_result("Bug 1 - Contract Value Type", False, f"Expected {expected_value} as number, got {stored_value} as {type(stored_value).__name__}")
        return False
    
    # Get the lead again to verify persistence
    response = make_request("GET", "/leads")
    if response and response.status_code == 200:
        leads = response.json()
        found_lead = next((lead for lead in leads if lead["id"] == lead_id), None)
        
        if found_lead:
            persistent_value = found_lead.get("contract_value")
            if isinstance(persistent_value, (int, float)) and persistent_value == expected_value:
                print_test_result("Bug 1 - Contract Value Persistence", True, f"Value persists correctly as {type(persistent_value).__name__}")
            else:
                print_test_result("Bug 1 - Contract Value Persistence", False, f"Value changed after persistence: {persistent_value}")
                return False
        else:
            print_test_result("Bug 1 - Lead Retrieval", False, "Lead not found after creation")
            return False
    
    return True

def test_bug_2_fechado_to_client():
    """Bug 2: Test that changing lead stage to 'fechado' creates client automatically"""
    print("=== Testing Bug 2: Fechado → Cliente Conversion ===")
    
    # Create a lead first
    lead_data = {
        "name": "Maria Santos",
        "email": "maria.santos@cliente.com",
        "phone": "+55 11 88888-8888",
        "company": "Santos & Associados",
        "stage": "proposta",
        "contract_value": 1500.00,
        "notes": "Lead para teste de conversão automática"
    }
    
    response = make_request("POST", "/leads", lead_data)
    if not response or response.status_code != 200:
        print_test_result("Bug 2 - Create Lead", False, "Failed to create lead")
        return False
    
    created_lead = response.json()
    lead_id = created_lead.get("id")
    print(f"   Created lead ID: {lead_id}")
    
    # Get current client count before conversion
    response = make_request("GET", "/clients")
    if not response or response.status_code != 200:
        print_test_result("Bug 2 - Get Clients Before", False, "Failed to get clients")
        return False
    
    clients_before = len(response.json())
    print(f"   Clients before conversion: {clients_before}")
    
    # Update lead stage to "fechado"
    update_data = {
        "stage": "fechado"
    }
    
    response = make_request("PUT", f"/leads/{lead_id}", update_data)
    if not response or response.status_code != 200:
        print_test_result("Bug 2 - Update Lead Stage", False, "Failed to update lead stage")
        return False
    
    updated_lead = response.json()
    if updated_lead.get("stage") != "fechado":
        print_test_result("Bug 2 - Lead Stage Update", False, f"Stage not updated correctly: {updated_lead.get('stage')}")
        return False
    
    print_test_result("Bug 2 - Lead Stage Update", True, "Lead stage updated to 'fechado'")
    
    # Check if client was created automatically
    response = make_request("GET", "/clients")
    if not response or response.status_code != 200:
        print_test_result("Bug 2 - Get Clients After", False, "Failed to get clients after conversion")
        return False
    
    clients_after = response.json()
    clients_count_after = len(clients_after)
    
    if clients_count_after > clients_before:
        # Find the new client with matching name
        new_client = next((client for client in clients_after 
                          if client["name"] == lead_data["name"]), None)
        
        if new_client:
            print_test_result("Bug 2 - Client Auto-Creation", True, 
                            f"Client '{new_client['name']}' created automatically")
            
            # Verify client has correct data from lead
            if (new_client.get("email") == lead_data["email"] and
                new_client.get("contract_value") == lead_data["contract_value"]):
                print_test_result("Bug 2 - Client Data Transfer", True, "Client data matches lead data")
            else:
                print_test_result("Bug 2 - Client Data Transfer", False, "Client data doesn't match lead data")
                return False
        else:
            print_test_result("Bug 2 - Client Auto-Creation", False, "No client found with matching lead name")
            return False
    else:
        print_test_result("Bug 2 - Client Auto-Creation", False, f"Client count didn't increase: {clients_before} -> {clients_count_after}")
        return False
    
    return True

def test_bug_3_tasks_today():
    """Bug 3: Test that tasks with today's due_date appear in dashboard stats"""
    print("=== Testing Bug 3: Tarefas do Dia ===")
    
    # Get today's date in YYYY-MM-DD format
    today = datetime.now().strftime("%Y-%m-%d")
    print(f"   Today's date: {today}")
    
    # Create a client first (needed for task)
    client_data = {
        "name": "Cliente Teste Tarefas",
        "email": "teste.tarefas@cliente.com",
        "contract_value": 800.00,
        "notes": "Cliente para teste de tarefas do dia"
    }
    
    response = make_request("POST", "/clients", client_data)
    if not response or response.status_code != 200:
        print_test_result("Bug 3 - Create Client", False, "Failed to create client for task test")
        return False
    
    client = response.json()
    client_id = client.get("id")
    
    # Create task with today's due_date
    task_data = {
        "title": "Tarefa de Hoje",
        "description": "Tarefa para teste do dashboard",
        "task_type": "follow_up",
        "due_date": today,  # Today's date in YYYY-MM-DD format
        "client_id": client_id
    }
    
    response = make_request("POST", "/tasks", task_data)
    if not response or response.status_code != 200:
        print_test_result("Bug 3 - Create Task", False, "Failed to create task")
        return False
    
    created_task = response.json()
    task_id = created_task.get("id")
    print(f"   Created task ID: {task_id} with due_date: {created_task.get('due_date')}")
    
    # Get dashboard stats
    response = make_request("GET", "/dashboard/stats")
    if not response or response.status_code != 200:
        print_test_result("Bug 3 - Get Dashboard Stats", False, "Failed to get dashboard stats")
        return False
    
    stats = response.json()
    tasks_today_count = stats.get("tasks_today", 0)
    tasks_today_list = stats.get("tasks_today_list", [])
    
    print(f"   Dashboard stats - tasks_today: {tasks_today_count}")
    print(f"   Tasks today list: {len(tasks_today_list)} items")
    
    # Check if our task appears in tasks_today
    our_task_in_list = any(task["id"] == task_id for task in tasks_today_list)
    
    if tasks_today_count > 0 and our_task_in_list:
        print_test_result("Bug 3 - Task Today Count", True, f"Task correctly appears in tasks_today ({tasks_today_count})")
    else:
        print_test_result("Bug 3 - Task Today Count", False, 
                         f"Task not found in today's tasks. Count: {tasks_today_count}, In list: {our_task_in_list}")
        return False
    
    # Verify the task in the list has correct data
    our_task_data = next((task for task in tasks_today_list if task["id"] == task_id), None)
    if our_task_data:
        if our_task_data.get("title") == task_data["title"]:
            print_test_result("Bug 3 - Task Data in List", True, "Task data correct in dashboard list")
        else:
            print_test_result("Bug 3 - Task Data in List", False, "Task data incorrect in dashboard list")
            return False
    
    return True

def test_bug_4_payment_dates():
    """Bug 4: Test that payment dates are saved/returned correctly as YYYY-MM-DD"""
    print("=== Testing Bug 4: Payment Date Format ===")
    
    # Use existing client or create one
    response = make_request("GET", "/clients")
    if not response or response.status_code != 200:
        print_test_result("Bug 4 - Get Clients", False, "Failed to get clients")
        return False
    
    clients = response.json()
    if not clients:
        # Create a client first
        client_data = {
            "name": "Cliente Teste Pagamentos",
            "email": "teste.pagamentos@cliente.com",
            "contract_value": 1200.00,
            "notes": "Cliente para teste de datas de pagamento"
        }
        
        response = make_request("POST", "/clients", client_data)
        if not response or response.status_code != 200:
            print_test_result("Bug 4 - Create Client", False, "Failed to create client")
            return False
        
        client = response.json()
    else:
        client = clients[0]
    
    client_id = client.get("id")
    
    # Create payment with specific due_date
    test_date = "2026-02-25"  # The specific date from the request
    payment_data = {
        "client_id": client_id,
        "description": "Pagamento teste de data",
        "amount": 500.00,
        "payment_type": "pontual",
        "due_date": test_date,
        "paid": False
    }
    
    response = make_request("POST", "/payments", payment_data)
    if not response or response.status_code != 200:
        print_test_result("Bug 4 - Create Payment", False, "Failed to create payment")
        return False
    
    created_payment = response.json()
    payment_id = created_payment.get("id")
    returned_date = created_payment.get("due_date")
    
    print(f"   Created payment ID: {payment_id}")
    print(f"   Sent due_date: {test_date}")
    print(f"   Returned due_date: {returned_date}")
    
    # Check if the returned date is exactly what we sent
    if returned_date == test_date:
        print_test_result("Bug 4 - Payment Date Creation", True, f"Date saved correctly as '{returned_date}'")
    else:
        print_test_result("Bug 4 - Payment Date Creation", False, 
                         f"Date modified: expected '{test_date}', got '{returned_date}'")
        return False
    
    # Get all payments to verify persistence
    response = make_request("GET", "/payments")
    if not response or response.status_code != 200:
        print_test_result("Bug 4 - Get Payments", False, "Failed to get payments")
        return False
    
    payments = response.json()
    found_payment = next((payment for payment in payments if payment["id"] == payment_id), None)
    
    if found_payment:
        persistent_date = found_payment.get("due_date")
        if persistent_date == test_date:
            print_test_result("Bug 4 - Payment Date Persistence", True, 
                             f"Date persists correctly as '{persistent_date}'")
        else:
            print_test_result("Bug 4 - Payment Date Persistence", False,
                             f"Date changed after persistence: expected '{test_date}', got '{persistent_date}'")
            return False
    else:
        print_test_result("Bug 4 - Payment Retrieval", False, "Payment not found after creation")
        return False
    
    return True

def main():
    """Main test execution"""
    print("RankFlow Backend Bug Testing")
    print("=" * 50)
    print(f"Testing against: {API_BASE}")
    print(f"Test credentials: {TEST_EMAIL}")
    print()
    
    # Test results tracking
    test_results = {
        "authentication": False,
        "bug_1_brl_currency": False,
        "bug_2_fechado_client": False,
        "bug_3_tasks_today": False,
        "bug_4_payment_dates": False
    }
    
    # Run authentication test first
    if not test_authentication():
        print("Authentication failed. Cannot proceed with other tests.")
        sys.exit(1)
    
    test_results["authentication"] = True
    
    # Run bug tests
    try:
        test_results["bug_1_brl_currency"] = test_bug_1_brl_currency()
        test_results["bug_2_fechado_client"] = test_bug_2_fechado_to_client()
        test_results["bug_3_tasks_today"] = test_bug_3_tasks_today()
        test_results["bug_4_payment_dates"] = test_bug_4_payment_dates()
    except Exception as e:
        print(f"Error during testing: {e}")
    
    # Print final summary
    print("=" * 50)
    print("FINAL TEST SUMMARY")
    print("=" * 50)
    
    passed_count = 0
    total_tests = len(test_results)
    
    for test_name, passed in test_results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name.replace('_', ' ').title()}")
        if passed:
            passed_count += 1
    
    print()
    print(f"Overall Result: {passed_count}/{total_tests} tests passed")
    
    if passed_count == total_tests:
        print("🎉 All tests PASSED!")
        sys.exit(0)
    else:
        print("⚠️  Some tests FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    main()