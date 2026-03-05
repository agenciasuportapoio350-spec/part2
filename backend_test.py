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
        self.failed_tests = []

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

def main():
    """Main test execution for Operations Panel"""
    print("🚀 Starting RankFlow Operations Panel API Tests\n")
    print("=" * 70)
    
    tester = RankFlowAPITester()
    
    # Test sequence focused on operations panel functionality
    tests = [
        ("Login Authentication", tester.test_login),
        ("Auth Check", tester.test_auth_me),
        ("Dashboard Stats API", tester.test_dashboard_stats_api),
        ("Operations Stats API", tester.test_operations_stats_api),
    ]
    
    # Run tests
    for test_name, test_func in tests:
        if not test_func():
            if test_name == "Login Authentication":
                print("\n❌ Critical failure: Cannot continue without authentication")
                break
    
    # Print final results
    print("\n" + "="*70)
    print(f"📊 API Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"  - {failure}")
    
    print("="*70)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())