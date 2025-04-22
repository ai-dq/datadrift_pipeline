# urls.py
from django.conf import settings
from django.urls import path, include
from django.urls import re_path
from django.views.static import serve
import os

urlpatterns = [
    re_path(r'^swagger/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR, 'static/openapi/swagger-dist-ui'),
        'show_indexes': True,
    }),
   path('', include('datasets.urls')),
]