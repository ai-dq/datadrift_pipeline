from django.urls import path
from datasets import views

urlpatterns = [
    path('datasets', views.DatasetList.as_view()),
]