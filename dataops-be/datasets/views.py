# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from utils.mongo import get_mongo_client
from bson import ObjectId
from bson.errors import InvalidId

# /datasets (데이터셋 생성, 데이터셋 전체 목록)
class DatasetList(APIView):
    def post(self, request):
        return Response({"message": "Dataset created."}, status=status.HTTP_201_CREATED)
        
    def get(self, request):
        db = get_mongo_client()
        datasets = db.datasets.find().sort("created_at", -1)  # 최신순 정렬

        result = []
        for ds in datasets:
            result.append({
                "id": str(ds["_id"]),
                "name": ds.get("name"),
                "description": ds.get("description", ""),
                "num_samples": ds.get("num_samples", 0),
                "labels": ds.get("labels", []),
                "created_at": ds.get("created_at")
            })

        return Response(result, status=status.HTTP_200_OK)
    
# /datasets/{dataset_id} (데이터셋에 파일 업로드, 특정 데이터셋 열람)
class DatasetUpload(APIView):
    def post(self, request, dataset_id):
        return Response({"message": "Data uploaded."}, status=status.HTTP_201_CREATED)
    
    def get(self, request, dataset_id):
        db = get_mongo_client()

        try:
            dataset = db.datasets.find_one({"_id": ObjectId(dataset_id)})
            if not dataset:
                return Response({"error": "Dataset not found."}, status=status.HTTP_404_NOT_FOUND)
        except InvalidId:
            return Response({"error": "Invalid dataset ID."}, status=status.HTTP_400_BAD_REQUEST)

        chunk = db.dataset_chunks.find_one({"dataset_id": dataset["_id"]})
        sample_records = chunk.get("records", [])[:10] if chunk else []

        response = {
            "id": str(dataset["_id"]),
            "name": dataset.get("name"),
            "description": dataset.get("description", ""),
            "num_samples": dataset.get("num_samples", 0),
            "labels": dataset.get("labels", []),
            "created_at": dataset.get("created_at"),
            "sample_records": sample_records
        }

        return Response(response, status=status.HTTP_200_OK)

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