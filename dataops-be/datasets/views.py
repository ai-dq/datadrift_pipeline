# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

# /datasets (데이터셋 생성, 데이터셋 전체 목록)
class DatasetList(APIView):
    def post(self, request):
        return Response({"message": "Dataset created."}, status=status.HTTP_201_CREATED)
        
    def get(self, request):
        return Response({"message": "Dataset example."}, status=status.HTTP_200_OK)
    
# /datasets/{dataset_id} (데이터셋에 파일 업로드, 특정 데이터셋 열람)
class DatasetUpload(APIView):
    def post(self, request, dataset_id):
        return Response({"message": "Data uploaded."}, status=status.HTTP_201_CREATED)
    
    def get(self, request, dataset_id):
        return Response({"message": "A dataset returned."}, status=status.HTTP_200_OK)

# /datasets/{dataset_id}/analysis (드리프트 검출 요청)
class DatasetAnalysis(APIView):
    def post(self, request, dataset_id):
        return Response({"message": "Dataset analysis started."}, status=status.HTTP_200_OK)

# /datasets/{dataset_id}/process (데이터셋 가공)
class DatasetProcess(APIView):
    def post(self, request, dataset_id):
        return Response({"message": "Dataset processing started."}, status=status.HTTP_200_OK)
    
# /datasets/{dataset_id}/files (데이터셋의 모든 파일 목록 조회)
class DatasetFileList(APIView):
    def get(self, request, dataset_id):
        return Response({"message": "File list returned."}, status=status.HTTP_200_OK)

# /datasets/{dataset_id}/files/{file_id} (특정 파일 정보 조회)
class DatasetFileDetail(APIView):
    def get(self, request, dataset_id):
        return Response({"message": "A file returned."}, status=status.HTTP_200_OK)