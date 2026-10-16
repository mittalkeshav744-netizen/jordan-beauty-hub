from rest_framework import serializers


class NewsletterSignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
