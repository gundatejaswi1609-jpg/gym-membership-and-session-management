import os
from dotenv import load_dotenv

# Load from .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

class Config:
    DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
    DB_PORT = int(os.getenv('DB_PORT', 3307))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'gym_db')
    
    SECRET_KEY = os.getenv('SECRET_KEY', 'apexfit_dev_secret_key_2026')
    PORT = int(os.getenv('PORT', 5001))
    
    # Razorpay Credentials (Sandbox/Test)
    RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', 'rzp_test_ApexFitMockKey99')
    RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', 'secret_ApexFitMockSecret99')
    RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET', 'whsec_ApexFitMockWebhook99')
    PAYMENT_TEST_MODE = os.getenv('PAYMENT_TEST_MODE', 'true').lower() in ('true', '1', 'yes')
    
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
