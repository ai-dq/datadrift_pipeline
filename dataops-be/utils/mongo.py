from pymongo import MongoClient
from django.conf import settings


def get_mongo_client():
    cfg = settings.MONGODB
    uri = f"mongodb://{cfg['USERNAME']}:{cfg['PASSWORD']}@{cfg['HOST']}:{cfg['PORT']}"
    return MongoClient(uri)[cfg['DB_NAME']]
