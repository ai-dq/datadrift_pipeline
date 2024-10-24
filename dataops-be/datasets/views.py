# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class DatasetList(APIView):
    def post(self, request):
        return Response({"message": "Dataset created."}, status=status.HTTP_201_CREATED)
        
    def get(self, request):
        return Response({"message": "Dataset example."}, status=status.HTTP_200_OK)
    
# /datasets/{dataset_id} (학습 데이터 업로드)
class DatasetUpload(APIView):
    def post(self, request, dataset_id):
        return Response({"message": "Data uploaded."}, status=status.HTTP_201_CREATED)

# /datasets/{dataset_id}/analysis (드리프트 검출 요청)
class DatasetAnalysis(APIView):
    def post(self, request, dataset_id):
        return Response({"message": "Dataset analysis started."}, status=status.HTTP_200_OK)

# /datasets/{dataset_id}/process (데이터셋 가공)
class DatasetProcess(APIView):
    def post(self, request, dataset_id):
        return Response({"message": "Dataset processing started."}, status=status.HTTP_200_OK)