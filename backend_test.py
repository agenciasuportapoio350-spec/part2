#!/usr/bin/env python3
"""
Backend test for RankFlow Etapa 4 - Checklists por Plano
Tests the checklist functionality for "unico" and "recorrente" plans
"""
import requests
import json
from datetime import datetime

# Backend URL from frontend/.env
BASE_URL = "https://rankflow-1.preview.emergentagent.com"

# Auth credentials
ADMIN_EMAIL = "admin@rankflow.com"
ADMIN_PASSWORD = "admin123456"

def print_test(name):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print('='*60)

def print_result(success, message):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {message}")

def login():
    """Login and return auth token"""
    print_test("Authentication Login")
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        print_result(True, f"Login successful for {ADMIN_EMAIL}")
        return token
    else:
        print_result(False, f"Login failed: {response.status_code} - {response.text}")
        return None

def test_create_client_unico_plan(token):
    """Test creating client with 'unico' plan and verify 12 checklist items"""
    print_test("Create Client with Unico Plan")
    
    headers = {"Authorization": f"Bearer {token}"}
    client_data = {
        "name": "Cliente Unico Teste",
        "plan": "unico", 
        "contract_value": 1000
    }
    
    response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=headers)
    
    if response.status_code == 200:
        client = response.json()
        print_result(True, f"Client created successfully: {client['name']}")
        
        # Check checklist has 12 items
        checklist = client.get('checklist', [])
        checklist_count = len(checklist)
        print_result(checklist_count == 12, f"Checklist has {checklist_count} items (expected 12)")
        
        # Verify checklist item structure
        if checklist:
            first_item = checklist[0]
            has_required_fields = all(field in first_item for field in ['id', 'title', 'completed', 'order'])
            print_result(has_required_fields, f"Checklist items have required fields: {list(first_item.keys())}")
        
        # Verify specific titles are present
        titles = [item['title'] for item in checklist]
        expected_titles = ["Criar perfil", "Primeira postagem", "Segunda postagem", "Enviar acesso ao cliente"]
        found_titles = [title for title in expected_titles if any(expected in item_title for item_title in titles for expected in [title])]
        print_result(len(found_titles) == len(expected_titles), f"Found expected titles: {found_titles}")
        
        # Verify weekly_checklist is null for unico plan
        weekly_checklist = client.get('weekly_checklist')
        print_result(weekly_checklist is None, f"Weekly checklist is null for unico plan: {weekly_checklist}")
        
        return client['id']
    else:
        print_result(False, f"Failed to create client: {response.status_code} - {response.text}")
        return None

def test_create_client_recorrente_plan(token):
    """Test creating client with 'recorrente' plan and verify 12 checklist items"""
    print_test("Create Client with Recorrente Plan")
    
    headers = {"Authorization": f"Bearer {token}"}
    client_data = {
        "name": "Cliente Recorrente Teste", 
        "plan": "recorrente",
        "contract_value": 2000
    }
    
    response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=headers)
    
    if response.status_code == 200:
        client = response.json()
        print_result(True, f"Client created successfully: {client['name']}")
        
        # Check checklist has 12 items
        checklist = client.get('checklist', [])
        checklist_count = len(checklist)
        print_result(checklist_count == 12, f"Checklist has {checklist_count} items (expected 12)")
        
        # Verify weekly_checklist is null initially
        weekly_checklist = client.get('weekly_checklist')
        print_result(weekly_checklist is None, f"Weekly checklist is null initially: {weekly_checklist}")
        
        # Verify initial_checklist_completed is False
        initial_completed = client.get('initial_checklist_completed', False)
        print_result(initial_completed == False, f"Initial checklist completed status: {initial_completed}")
        
        return client['id'], checklist
    else:
        print_result(False, f"Failed to create client: {response.status_code} - {response.text}")
        return None, []

def test_checklist_titles(checklist):
    """Test that checklist contains expected titles"""
    print_test("Verify Checklist Initial Titles (12 steps)")
    
    titles = [item['title'] for item in checklist]
    print(f"Found {len(titles)} checklist items:")
    for i, title in enumerate(titles, 1):
        print(f"  {i}. {title}")
    
    # Expected titles based on CHECKLIST_INICIAL from server.py
    expected_titles = [
        "Criar perfil",
        "Primeira postagem", 
        "Segunda postagem",
        "Enviar acesso ao cliente"
    ]
    
    all_found = True
    for expected in expected_titles:
        found = any(expected in title for title in titles)
        print_result(found, f"Title contains '{expected}': {found}")
        if not found:
            all_found = False
    
    return all_found

def test_complete_all_checklist_items(token, client_id, checklist):
    """Complete all 12 checklist items and verify weekly checklist activation"""
    print_test("Complete All Checklist Items and Activate Weekly Checklist")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Complete each checklist item
    for i, item in enumerate(checklist):
        item_id = item['id']
        response = requests.put(f"{BASE_URL}/api/clients/{client_id}/checklist/{item_id}", headers=headers)
        
        if response.status_code == 200:
            print_result(True, f"Completed item {i+1}: {item['title']}")
        else:
            print_result(False, f"Failed to complete item {i+1}: {response.status_code}")
            return False
    
    # Get updated client to check weekly checklist activation
    response = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=headers)
    
    if response.status_code == 200:
        updated_client = response.json()
        
        # Check if initial checklist is marked as completed
        initial_completed = updated_client.get('initial_checklist_completed', False)
        print_result(initial_completed == True, f"Initial checklist marked as completed: {initial_completed}")
        
        # Check if weekly checklist was activated
        weekly_checklist = updated_client.get('weekly_checklist')
        if weekly_checklist:
            enabled = weekly_checklist.get('enabled', False)
            print_result(enabled == True, f"Weekly checklist enabled: {enabled}")
            
            # Check weekly checklist has 5 items
            weekly_items = weekly_checklist.get('items', [])
            weekly_count = len(weekly_items)
            print_result(weekly_count == 5, f"Weekly checklist has {weekly_count} items (expected 5)")
            
            # Print weekly checklist titles
            if weekly_items:
                print("Weekly checklist items:")
                for i, item in enumerate(weekly_items, 1):
                    print(f"  {i}. {item['title']}")
            
            return True
        else:
            print_result(False, "Weekly checklist not activated")
            return False
    else:
        print_result(False, f"Failed to get updated client: {response.status_code}")
        return False

def test_weekly_checklist_functionality(token, client_id):
    """Test weekly checklist item completion"""
    print_test("Weekly Checklist Item Toggle")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get client to access weekly checklist
    response = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=headers)
    
    if response.status_code == 200:
        client = response.json()
        weekly_checklist = client.get('weekly_checklist')
        
        if weekly_checklist and weekly_checklist.get('enabled'):
            weekly_items = weekly_checklist.get('items', [])
            
            if weekly_items:
                # Test completing first weekly item
                first_item_id = weekly_items[0]['id']
                response = requests.put(f"{BASE_URL}/api/clients/{client_id}/weekly-checklist/{first_item_id}", headers=headers)
                
                if response.status_code == 200:
                    print_result(True, f"Successfully toggled weekly checklist item: {weekly_items[0]['title']}")
                    return True
                else:
                    print_result(False, f"Failed to toggle weekly item: {response.status_code}")
                    return False
            else:
                print_result(False, "No weekly checklist items found")
                return False
        else:
            print_result(False, "Weekly checklist not enabled")
            return False
    else:
        print_result(False, f"Failed to get client: {response.status_code}")
        return False

def main():
    """Main test execution"""
    print("RankFlow Etapa 4 - Checklist Testing")
    print(f"Testing against: {BASE_URL}")
    print(f"Test started at: {datetime.now()}")
    
    # Login
    token = login()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    
    # Test 1: Create client with unico plan
    unico_client_id = test_create_client_unico_plan(token)
    
    # Test 2: Create client with recorrente plan
    recorrente_client_id, initial_checklist = test_create_client_recorrente_plan(token)
    
    if not recorrente_client_id:
        print("❌ Cannot proceed without recorrente client")
        return
    
    # Test 3: Verify checklist titles
    test_checklist_titles(initial_checklist)
    
    # Test 4: Complete all checklist items and activate weekly checklist
    weekly_activated = test_complete_all_checklist_items(token, recorrente_client_id, initial_checklist)
    
    # Test 5: Test weekly checklist functionality
    if weekly_activated:
        test_weekly_checklist_functionality(token, recorrente_client_id)
    
    print(f"\n{'='*60}")
    print("TESTING COMPLETED")
    print('='*60)

if __name__ == "__main__":
    main()