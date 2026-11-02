from rest_framework import serializers


class NewsletterSignupSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ChatHistoryTurnSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=2000)


class BeautyChatSerializer(serializers.Serializer):
    message = serializers.CharField(min_length=1, max_length=1000)
    history = ChatHistoryTurnSerializer(many=True, required=False, default=list)
    # Current storefront path so Mira can answer about this page (e.g. /products/slug).
    page_path = serializers.CharField(required=False, allow_blank=True, max_length=200, default="")

    def validate_history(self, history):
        # Keep history short so Gemini stays fast (server also trims to 6).
        if len(history) > 8:
            raise serializers.ValidationError("Keep the conversation shorter and try again.")
        return history

    def validate_page_path(self, page_path):
        path = (page_path or "").strip()
        if not path:
            return ""
        if not path.startswith("/") or "//" in path or "://" in path:
            raise serializers.ValidationError("Enter a valid site path.")
        return path[:200]
