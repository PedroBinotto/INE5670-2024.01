from datetime import datetime
from typing import List
import uuid
from fastapi import Body, FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field
from pymongo import MongoClient
from dotenv import dotenv_values
from bson.objectid import ObjectId as BsonObjectId

env = dotenv_values(".env")

app = FastAPI()


class RecordCreateModel(BaseModel):
    turnedOnAt: datetime
    turnedOffAt: datetime


class PydanticObjectId(BsonObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, x):
        if not isinstance(v, BsonObjectId):
            raise TypeError("ObjectId required")
        return str(v)


class Record(BaseModel):
    id: PydanticObjectId = Field(default_factory=uuid.uuid4, alias="_id")
    turnedOnAt: datetime = Field(...)
    turnedOffAt: datetime = Field(...)


@app.on_event("startup")
def startup_db_client():
    app.mongodb_client = MongoClient(
        env["MONGO_URI"], username=env["MONGO_USERNAME"], password=env["MONGO_PASSWORD"]
    )
    app.database = app.mongodb_client[env["DB_NAME"]]


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
    print(record)
    record = jsonable_encoder(record)
    new_record = app.database["records"].insert_one(record)
    created_record = app.database["records"].find_one({"_id": new_record.inserted_id})
    print(created_record)

    return created_record
