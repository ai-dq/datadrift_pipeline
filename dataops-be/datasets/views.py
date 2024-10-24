# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class DatasetList(APIView):
    def post(self, request):
        return Response({"message": "Dataset created."}, status=status.HTTP_201_CREATED)
        
    def get(self, request):
        return Response({"message": "Dataset example."}, status=status.HTTP_200_OK)

