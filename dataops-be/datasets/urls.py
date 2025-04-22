from django.urls import path
from datasets import views

urlpatterns = [
    path('datasets', views.DatasetList.as_view()),
    path('datasets/<str:dataset_id>', views.DatasetUpload.as_view()),
    path('datasets/<str:dataset_id>/images', views.DatasetImageList.as_view()),
    path('datasets/<str:dataset_id>/images/<str:image_id>', views.DatasetImageDetail.as_view()),
    path('datasets/<str:dataset_id>/analysis', views.DatasetAnalysis.as_view()),
    path('datasets/<str:dataset_id>/process', views.DatasetProcess.as_view()),
]