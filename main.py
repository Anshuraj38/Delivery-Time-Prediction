from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Annotated
import pandas as pd
import joblib
from fastapi.middleware.cors import CORSMiddleware
import pickle
import json


# =========================================================
# 1. CREATE FASTAPI APP
# =========================================================

app = FastAPI(
    title="Delivery Time Prediction API",
    description="ML API for predicting delivery time",
    version="1.0"
)


# =========================================================
# 2. CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://delivery-time-prediction-1-dat4.onrender.com/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# 3. LOAD MODEL + SCALER + FEATURE COLUMNS
# =========================================================

# model = joblib.load("models/xgb2_best.pkl")
import xgboost as xgb

model = xgb.XGBRegressor()
model.load_model("models/xgb_model.json")


    

scaler = joblib.load(
    "models/standard_scaler.pkl"
)

feature_columns = joblib.load(
    "models/feature_columns.pkl"
)


# =========================================================
# 4. PYDANTIC INPUT MODEL
# =========================================================

class DeliveryInput(BaseModel):

    Delivery_person_Age: Annotated[
        int,
        Field(
            ...,
            gt=0,
            description="Age of delivery person"
        )
    ]

    Delivery_person_Ratings: Annotated[
        int,
        Field(
            ...,
            gt=0,
            le=5,
            description="Rating of delivery person"
        )
    ]

    distance_km: Annotated[
        float,
        Field(
            ...,
            gt=0,
            lt=20,
            description="Distance between restaurant and customer"
        )
    ]

    order_hour: Annotated[
        float,
        Field(
            ...,
            ge=0,
            le=23,
            description="Order hour"
        )
    ]

    Weatherconditions: str

    Road_traffic_density: str

    Vehicle_condition: Annotated[
        int,
        Field(
            ...,
            ge=0,
            le=3
        )
    ]

    Type_of_order: str

    Type_of_vehicle: str

    multiple_deliveries: int

    Festival: Annotated[bool,Field(description='Diwali, Chath')]

    City: Annotated[str,Field(description='Mumbai, Delhi')]


# =========================================================
# 5. HOME
# =========================================================

@app.get("/")
def home():

    return {
        "Welcome": "Delivery Time Prediction API is running"
    }


# =========================================================
# 6. PREDICTION
# =========================================================

@app.post("/predict")
def predict(data: DeliveryInput):

    # -----------------------------------------------------
    # Convert Pydantic object → dictionary
    # -----------------------------------------------------

    input_data = data.model_dump()

    # -----------------------------------------------------
    # Dictionary → DataFrame
    # -----------------------------------------------------

    X = pd.DataFrame([input_data])


    # =====================================================
    # 7. TRAFFIC MAPPING
    # =====================================================

    traffic_mapping = {
        "Low": 0,
        "Medium": 1,
        "High": 2,
        "Jam": 3
    }

    X["Road_traffic_density"] = (
        X["Road_traffic_density"]
        .map(traffic_mapping)
    )


    # =====================================================
    # 8. FESTIVAL BOOLEAN → INTEGER
    # =====================================================

    X["Festival"] = X["Festival"].astype(int)


    # =====================================================
    # 9. ONE-HOT ENCODING
    # =====================================================

    X = pd.get_dummies(
        X,
        columns=[
            "Type_of_order",
            "Type_of_vehicle",
            "Festival",
            "City",
            "Weatherconditions"
        ],
        drop_first=True,
        dtype=int
    )


    # =====================================================
    # 10. MAKE COLUMNS SAME AS TRAINING
    # =====================================================

    X = X.reindex(
        columns=feature_columns,
        fill_value=0
    )


    # =====================================================
    # 11. SCALE FEATURES
    # =====================================================

    X_scaled = scaler.transform(X)


    # =====================================================
    # 12. PREDICTION
    # =====================================================

    prediction = model.predict(X_scaled)


    # =====================================================
    # 13. RESPONSE
    # =====================================================

    return {
        "prediction": float(prediction[0])
    }