from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('advanced-js-mapping/', include('advanced_js_mapping.urls')),
]