import requests
import sys
import json
import hmac
import hashlib
from datetime import datetime

class ShopifySkinAppTester:
    def __init__(self, base_url="https://app-proxy-test.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log a test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}{endpoint}"
        test_headers = {"Content-Type": "application/json"}
        if headers:
            test_headers.update(headers)

        try:
            if method == "GET":
                response = requests.get(url, headers=test_headers)
            elif method == "POST":
                response = requests.post(url, json=data, headers=test_headers)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            details = f"Status: {response.status_code}, Expected: {expected_status}"
            if not success:
                details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def create_hmac_signature(self, data, secret=""):
        """Create HMAC-SHA256 signature for webhook testing"""
        if not secret:
            # Empty secret for dev testing
            return "mock_hmac_signature"
        
        message = json.dumps(data).encode('utf-8')
        signature = hmac.new(secret.encode('utf-8'), message, hashlib.sha256)
        return signature.hexdigest()

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n=== Testing Basic Endpoints ===")
        
        # Test root endpoint
        self.run_test("API Root", "GET", "/", 200)
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "/health", 200)

    def test_billing_endpoints(self):
        """Test billing-related endpoints"""
        print("\n=== Testing Billing Endpoints ===")
        
        # Test get plans
        success, plans_data = self.run_test("Get Billing Plans", "GET", "/billing/plans", 200)
        if success and "plans" in plans_data:
            plans = plans_data["plans"]
            if "starter" in plans and "professional" in plans:
                starter = plans["starter"]
                professional = plans["professional"]
                
                # Verify plan details
                starter_valid = (starter.get("price") == 4.99 and starter.get("scan_limit") == 100)
                professional_valid = (professional.get("price") == 9.99 and professional.get("scan_limit") == 250)
                
                self.log_test("Validate Starter Plan", starter_valid, f"Price: ${starter.get('price')}, Scans: {starter.get('scan_limit')}")
                self.log_test("Validate Professional Plan", professional_valid, f"Price: ${professional.get('price')}, Scans: {professional.get('scan_limit')}")
            else:
                self.log_test("Plans Structure", False, "Missing starter or professional plans")
        
        # Test billing status for demo store
        self.run_test("Get Billing Status", "GET", "/billing/status/demo-store.myshopify.com", 200)
        
        # Test billing cancel (this will work even without active subscription)
        self.run_test("Cancel Subscription", "POST", "/billing/cancel", 200, {
            "shop_domain": "demo-store.myshopify.com",
            "plan_id": "starter"
        })

    def test_dashboard_endpoints(self):
        """Test dashboard-related endpoints"""
        print("\n=== Testing Dashboard Endpoints ===")
        
        # Seed demo data first
        success, demo_data = self.run_test("Seed Demo Data", "GET", "/dashboard/demo-data", 200)
        
        # Test dashboard overview
        success, overview_data = self.run_test("Dashboard Overview", "GET", "/dashboard/overview?shop_domain=demo-store.myshopify.com", 200)
        if success:
            required_fields = ["total_shops", "active_shops", "total_scans", "scans_today", "chart_data", "skin_type_distribution"]
            for field in required_fields:
                field_exists = field in overview_data
                self.log_test(f"Overview - {field} field", field_exists, f"Field present: {field_exists}")
        
        # Test scan history
        self.run_test("Get Scan History", "GET", "/dashboard/scans?shop_domain=demo-store.myshopify.com", 200)
        
        # Test get settings
        success, settings_data = self.run_test("Get Settings", "GET", "/dashboard/settings?shop_domain=demo-store.myshopify.com", 200)
        
        # Test save settings
        test_settings = {
            "shop_domain": "demo-store.myshopify.com",
            "camera_enabled": True,
            "auto_recommend": False,
            "collection_id": "123456",
            "custom_branding": True,
            "brand_color": "#FF0000"
        }
        self.run_test("Save Settings", "POST", "/dashboard/settings", 200, test_settings)

    def test_webhook_endpoints(self):
        """Test webhook endpoints with HMAC verification"""
        print("\n=== Testing Webhook Endpoints ===")
        
        # Test get webhook logs
        self.run_test("Get Webhook Logs", "GET", "/webhooks/logs", 200)
        
        # Test GDPR webhooks with mock HMAC (since SHOPIFY_API_SECRET is empty)
        # Note: These will pass HMAC verification because the secret is empty in dev
        
        # Customer redact webhook
        customer_redact_data = {
            "shop_domain": "demo-store.myshopify.com",
            "customer": {"id": 12345}
        }
        hmac_signature = self.create_hmac_signature(customer_redact_data)
        headers = {"X-Shopify-Hmac-SHA256": hmac_signature, "X-Shopify-Topic": "customers/redact"}
        
        # Note: These webhook tests will likely fail HMAC verification in the actual implementation
        # because we can't generate valid HMAC without the real secret
        self.run_test("Customer Redact Webhook", "POST", "/webhooks/customers/redact", 401, customer_redact_data, headers)
        
        # Shop redact webhook  
        shop_redact_data = {"shop_domain": "demo-store.myshopify.com"}
        headers = {"X-Shopify-Hmac-SHA256": hmac_signature, "X-Shopify-Topic": "shop/redact"}
        self.run_test("Shop Redact Webhook", "POST", "/webhooks/shop/redact", 401, shop_redact_data, headers)
        
        # Customer data request webhook
        data_request_data = {
            "shop_domain": "demo-store.myshopify.com", 
            "customer": {"id": 12345}
        }
        headers = {"X-Shopify-Hmac-SHA256": hmac_signature, "X-Shopify-Topic": "customers/data-request"}
        self.run_test("Customer Data Request Webhook", "POST", "/webhooks/customers/data-request", 401, data_request_data, headers)
        
        # App uninstalled webhook
        uninstall_data = {"domain": "demo-store.myshopify.com"}
        headers = {"X-Shopify-Hmac-SHA256": hmac_signature, "X-Shopify-Topic": "app/uninstalled"}
        self.run_test("App Uninstalled Webhook", "POST", "/webhooks/app/uninstalled", 401, uninstall_data, headers)

    def test_skin_analysis(self):
        """Test skin analysis endpoint"""
        print("\n=== Testing Skin Analysis ===")
        
        # Test with a simple base64 image (minimal JPEG)
        # This is a tiny 1x1 JPEG image in base64
        test_image_base64 = "/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gOTAK/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgAAQABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBkQgUobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/ooooA//2Q=="
        
        analysis_data = {"image": test_image_base64}
        # This test may fail if OpenAI API key is not configured
        success, result = self.run_test("Skin Analysis", "POST", "/analysis/analyze", 200, analysis_data)
        if not success:
            # Try with expected error status for missing API key
            self.run_test("Skin Analysis (No API Key)", "POST", "/analysis/analyze", 500, analysis_data)

    def run_all_tests(self):
        """Run all test suites"""
        print("🧪 Starting Shopify Skin AI App Backend Tests")
        print(f"📡 Testing API at: {self.api_url}")
        print("=" * 60)
        
        try:
            self.test_basic_endpoints()
            self.test_billing_endpoints() 
            self.test_dashboard_endpoints()
            self.test_webhook_endpoints()
            self.test_skin_analysis()
        except Exception as e:
            print(f"❌ Test suite failed with exception: {e}")
        
        # Print final results
        print("\n" + "=" * 60)
        print("🏁 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"📊 Tests run: {self.tests_run}")
        print(f"✅ Tests passed: {self.tests_passed}")
        print(f"❌ Tests failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ShopifySkinAppTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())