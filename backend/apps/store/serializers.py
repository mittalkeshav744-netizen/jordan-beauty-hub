from rest_framework import serializers


class NewsletterSignupSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ChatHistoryTurnSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=2000)


class BeautyChatSerializer(serializers.Serializer):
    message = serializers.CharField(min_length=1, max_length=1000)
    history = ChatHistoryTurnSerializer(many=True, required=False, default=list)

    def validate_history(self, history):
        if len(history) > 12:
            raise serializers.ValidationError("Keep the conversation shorter and try again.")
        return history
