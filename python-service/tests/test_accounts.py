import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
def test_user_registration_requires_age_18(api_client):
    url = reverse("accounts:register")
    data = {
        "username": "underage_user",
        "email": "underage@kreativa.app",
        "password": "Password123!",
        "password_confirm": "Password123!",
        "date_of_birth": "2015-01-01" # 11 years old
    }
    
    response = api_client.post(url, data, format="json")
    assert response.status_code == 400
    assert "date_of_birth" in response.data

@pytest.mark.django_db
def test_user_registration_success(api_client):
    url = reverse("accounts:register")
    data = {
        "username": "valid_user",
        "email": "valid@kreativa.app",
        "password": "Password123!",
        "password_confirm": "Password123!",
        "date_of_birth": "2000-01-01" # 26 years old
    }
    
    response = api_client.post(url, data, format="json")
    assert response.status_code == 201
    assert User.objects.filter(username="valid_user").exists()
