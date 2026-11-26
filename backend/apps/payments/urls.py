from django.urls import path

from . import views

urlpatterns = [
    path("methods/", views.payment_methods, name="payment-methods"),
    path("razorpay/create/", views.razorpay_create, name="razorpay-create"),
    path("razorpay/verify/", views.razorpay_verify, name="razorpay-verify"),
    path("razorpay/webhook/", views.razorpay_webhook, name="razorpay-webhook"),
]
