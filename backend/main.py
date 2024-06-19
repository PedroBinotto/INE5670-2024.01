from datetime import datetime
from typing import List
import uuid
from fastapi import Body, FastAPI, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field
from pymongo import MongoClient
from dotenv import dotenv_values
from bson.objectid import ObjectId as BsonObjectId
from fastapi.middleware.cors import CORSMiddleware

env = dotenv_values(".env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PydanticObjectId(BsonObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, *_):
        if not isinstance(v, BsonObjectId):
            raise TypeError("ObjectId required")
        return str(v)


class RecordCreateModel(BaseModel):
    turnedOnAt: datetime
    turnedOffAt: datetime


class Record(BaseModel):
    id: PydanticObjectId = Field(default_factory=uuid.uuid4, alias="_id")
    turnedOnAt: datetime = Field(...)
    turnedOffAt: datetime = Field(...)


@app.on_event("startup")
def startup_db_client():
    uri = env["MONGO_URI"]
    user = env["MONGO_USERNAME"]
    password = env["MONGO_PASSWORD"]
    database_name = env["DB_NAME"]

    app.mongodb_client = MongoClient(uri, username=user, password=password)
    app.database = app.mongodb_client[database_name]


@app.get("/api", response_description="List all records", response_model=List[Record])
async def getData():
    records = list(app.database["records"].find(limit=1024))
    return records


@app.post(
    "/api",
    response_description="Create a new record",
    status_code=status.HTTP_201_CREATED,
    response_model=Record,
)
async def postData(record: RecordCreateModel = Body(...)):
    record = jsonable_encoder(record)
    new_record = app.database["records"].insert_one(record)
    created_record = app.database["records"].find_one({"_id": new_record.inserted_id})

    return created_record
