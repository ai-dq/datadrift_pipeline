from django.urls import path
from datasets import views

urlpatterns = [
    path('datasets', views.DatasetList.as_view()),
    path('datasets/<int:dataset_id>', views.DatasetUpload.as_view()),
    path('datasets/<int:dataset_id>/analysis', views.DatasetAnalysis.as_view()),
    path('datasets/<int:dataset_id>/process', views.DatasetProcess.as_view()),
    path('datasets/<int:dataset_id>/files', views.DatasetFileList.as_view()),
    path('datasets/<int:dataset_id>/files/<int:file_id>', views.DatasetFileDetail.as_view()),
]