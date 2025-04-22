# views.py
import datetime

from bson import ObjectId
from bson.errors import InvalidId
from utils.mongo import get_mongo_client
from gridfs import GridFS

from django.http import FileResponse, HttpResponseNotFound
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

db = get_mongo_client()

# /datasets (데이터셋 생성, 데이터셋 전체 목록)
class DatasetList(APIView):
    def post(self, request):
        data = request.data

        name = data.get("name")
        if not name:
            return Response(
                {"error": "Dataset name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dataset = {
            "name": name,
            "description": data.get("description", ""),
            "labels": data.get("labels", []),
            "num_samples": 0,
            "created_at": datetime.datetime.now(),
        }

        result = db.datasets.insert_one(dataset)

        response_data = {
            "id": str(result.inserted_id),
            "name": dataset["name"],
            "description": dataset["description"],
            "labels": dataset["labels"],
            "num_samples": dataset["num_samples"],
            "created_at": dataset["created_at"],
        }

        return Response(response_data, status=status.HTTP_201_CREATED)

    def get(self, request):
        datasets = db.datasets.find().sort("created_at", -1)  # 최신순 정렬

        result = []
        for ds in datasets:
            result.append(
                {
                    "id": str(ds["_id"]),
                    "name": ds.get("name"),
                    "description": ds.get("description", ""),
                    "num_samples": ds.get("num_samples", 0),
                    "labels": ds.get("labels", []),
                    "created_at": ds.get("created_at"),
                }
            )

        return Response(result, status=status.HTTP_200_OK)


# /datasets/{dataset_id} (데이터셋에 파일 업로드, 특정 데이터셋 열람)
class DatasetUpload(APIView):
    def post(self, request, dataset_id):
        try:
            dataset = db.datasets.find_one({"_id": ObjectId(dataset_id)})
            if not dataset:
                return Response({"error": "Dataset not found."}, status=status.HTTP_404_NOT_FOUND)
        except InvalidId:
            return Response({"error": "Invalid dataset ID."}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        fs = GridFS(db)
        file_id = fs.put(
            uploaded_file.read(),
            filename=uploaded_file.name,
            content_type=uploaded_file.content_type,
            metadata={
                "dataset_id": str(dataset["_id"]),
                "uploaded_at": datetime.datetime.now()
            }
        )

        db.datasets.update_one(
            {"_id": dataset["_id"]},
            {"$inc": {"num_samples": 1}}
        )

        return Response({
            "dataset_id": str(dataset["_id"]),
            "file_id": str(file_id),
            "filename": uploaded_file.name,
            "content_type": uploaded_file.content_type,
            "status": "uploaded"
        }, status=status.HTTP_201_CREATED)

    def get(self, request, dataset_id):
        try:
            dataset = db.datasets.find_one({"_id": ObjectId(dataset_id)})
            if not dataset:
                return Response(
                    {"error": "Dataset not found."}, status=status.HTTP_404_NOT_FOUND
                )
        except InvalidId:
            return Response(
                {"error": "Invalid dataset ID."}, status=status.HTTP_400_BAD_REQUEST
            )

        chunk = db.dataset_chunks.find_one({"dataset_id": dataset["_id"]})
        sample_records = chunk.get("records", [])[:10] if chunk else []

        response = {
            "id": str(dataset["_id"]),
            "name": dataset.get("name"),
            "description": dataset.get("description", ""),
            "num_samples": dataset.get("num_samples", 0),
            "labels": dataset.get("labels", []),
            "created_at": dataset.get("created_at"),
            "sample_records": sample_records,
        }

        return Response(response, status=status.HTTP_200_OK)
    

# /datasets/{dataset_id}/images (데이터셋의 모든 이미지 목록 조회 - 이미지 타입 데이터셋 한정)
class DatasetImageList(APIView):
    def get(self, request, dataset_id):
        try:
            dataset = db.datasets.find_one({"_id": ObjectId(dataset_id)})
            if not dataset:
                return Response({"error": "Dataset not found."}, status=status.HTTP_404_NOT_FOUND)
            if "image" not in dataset.get("labels", []):
                return Response({"error": "This dataset does not contain images."}, status=status.HTTP_400_BAD_REQUEST)
        except InvalidId:
            return Response({"error": "Invalid dataset ID."}, status=status.HTTP_400_BAD_REQUEST)

        # fs.files에서 이미지 메타 정보 추출
        files_cursor = db.fs.files.find({"metadata.dataset_id": dataset_id})
        file_list = []
        for file in files_cursor:
            file_list.append({
                "file_id": str(file["_id"]),
                "filename": file["filename"],
                "content_type": file.get("contentType", "application/octet-stream"),
                "uploaded_at": file["uploadDate"],
            })

        return Response(file_list, status=status.HTTP_200_OK)

class DatasetImageDetail(APIView):
    def get(self, request, dataset_id, image_id):
        try:
            dataset = db.datasets.find_one({"_id": ObjectId(dataset_id)})
            if not dataset:
                return Response({"error": "Dataset not found."}, status=status.HTTP_404_NOT_FOUND)
            if "image" not in dataset.get("labels", []):
                return Response({"error": "This dataset does not contain images."}, status=status.HTTP_400_BAD_REQUEST)
        except InvalidId:
            return Response({"error": "Invalid dataset ID."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fs = GridFS(db)
            grid_file = fs.get(ObjectId(image_id))
        except Exception:
            return HttpResponseNotFound("Image not found.")

        response = FileResponse(grid_file, content_type=grid_file.content_type)
        response['Content-Disposition'] = f'inline; filename="{grid_file.filename}"'
        return response


# /datasets/{dataset_id}/analysis (드리프트 검출 요청)
class DatasetAnalysis(APIView):
    def post(self, request, dataset_id):
        return Response(
            {"message": "Dataset analysis started."}, status=status.HTTP_200_OK
        )


# /datasets/{dataset_id}/process (데이터셋 가공)
class DatasetProcess(APIView):
    def post(self, request, dataset_id):
        return Response(
            {"message": "Dataset processing started."}, status=status.HTTP_200_OK
        )