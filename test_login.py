#!/usr/bin/env python3
"""Test login endpoint directly"""

import requests
import json

# Test credentials
email = "admin@example.com"
password = "admin1"

# Prepare request
url = "http://localhost:8000/api/v1/auth/login"
headers = {"Content-Type": "application/json"}
payload = {"email": email, "password": password}

print(f"Testing login to: {url}")
print(f"Payload: {json.dumps(payload)}")
print()

try:
    response = requests.post(url, json=payload, headers=headers, timeout=5)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body: {response.text}")
    print()
    
    if response.status_code == 200:
        data = response.json()
        print("✅ LOGIN SUCCESSFUL!")
        print(f"Access Token: {data['access_token'][:50]}...")
        print(f"Token Type: {data.get('token_type')}")
    else:
        print(f"❌ Login Failed with status {response.status_code}")
        try:
            error_data = response.json()
            print(f"Error Details: {json.dumps(error_data, indent=2)}")
        except:
            print(f"Error Body: {response.text}")
            
except Exception as e:
    print(f"❌ Exception: {e}")
    import traceback
    traceback.print_exc()
