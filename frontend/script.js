const API_URL = "https://delivery-time-prediction-hc7e.onrender.com";


// =====================================================
// CAPITALIZATION / NORMALIZATION
// =====================================================

function normalizeTraffic(value) {

    const mapping = {
        "low": "Low",
        "medium": "Medium",
        "high": "High",
        "jam": "Jam"
    };

    return mapping[value.toLowerCase()];
}


function normalizeWeather(value) {

    const mapping = {
        "fog": "Fog",
        "stormy": "Stormy",
        "cloudy": "Cloudy",
        "sandstorms": "Sandstorms",
        "windy": "Windy",
        "sunny": "Sunny"
    };

    return mapping[value.toLowerCase()];
}


function normalizeOrder(value) {

    const mapping = {
        "snack": "Snack",
        "meal": "Meal",
        "drinks": "Drinks",
        "buffet": "Buffet"
    };

    return mapping[value.toLowerCase()];
}


function normalizeVehicle(value) {

    const mapping = {
        "motorcycle": "motorcycle",
        "scooter": "scooter",
        "electric_scooter": "electric_scooter",
        "bicycle": "bicycle"
    };

    return mapping[value.toLowerCase()];
}


function normalizeCity(value) {

    const mapping = {
        "metropolitian": "Metropolitian",
        "urban": "Urban",
        "semi-urban": "Semi-Urban"
    };

    return mapping[value.toLowerCase()];
}


// =====================================================
// FORM SUBMISSION
// =====================================================

document
    .getElementById("predictionForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();


        // Hide old messages

        document
            .getElementById("result")
            .classList.add("d-none");

        document
            .getElementById("errorMessage")
            .classList.add("d-none");


        // Show loading

        document
            .getElementById("loading")
            .classList.remove("d-none");


        // Disable button

        const button = document.getElementById("predictBtn");

        button.disabled = true;


        // =================================================
        // GET VALUES
        // =================================================

        const age =
            parseInt(document.getElementById("age").value);

        const rating =
            parseFloat(document.getElementById("rating").value);

        const distance =
            parseFloat(document.getElementById("distance").value);

        const orderHour =
            parseFloat(document.getElementById("order_hour").value);

        const weather =
            normalizeWeather(
                document.getElementById("weather").value
            );

        const traffic =
            normalizeTraffic(
                document.getElementById("traffic").value
            );

        const vehicleCondition =
            parseInt(
                document.getElementById("vehicle_condition").value
            );

        const typeOfOrder =
            normalizeOrder(
                document.getElementById("type_of_order").value
            );

        const typeOfVehicle =
            normalizeVehicle(
                document.getElementById("type_of_vehicle").value
            );

        const multipleDeliveries =
            parseInt(
                document.getElementById("multiple_deliveries").value
            );

        const festivalValue =
            document.getElementById("festival").value;

        const city =
            normalizeCity(
                document.getElementById("city").value
            );


        // =================================================
        // YES / NO → BOOLEAN
        // =================================================

        const festival =
            festivalValue.toLowerCase() === "yes";


        // =================================================
        // CREATE JSON
        // =================================================

        const data = {

            Delivery_person_Age: age,

            Delivery_person_Ratings: rating,

            distance_km: distance,

            order_hour: orderHour,

            Weatherconditions: weather,

            Road_traffic_density: traffic,

            Vehicle_condition: vehicleCondition,

            Type_of_order: typeOfOrder,

            Type_of_vehicle: typeOfVehicle,

            multiple_deliveries: multipleDeliveries,

            Festival: festival,

            City: city
        };


        console.log("Sending data:", data);


        // =================================================
        // SEND REQUEST TO FASTAPI
        // =================================================

        try {

            const response = await fetch(API_URL, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(data)

            });


            // =================================================
            // HANDLE API ERROR
            // =================================================

            if (!response.ok) {

                const errorData = await response.json();

                throw new Error(
                    errorData.detail
                        ? JSON.stringify(errorData.detail)
                        : "Prediction failed"
                );
            }


            // =================================================
            // GET RESPONSE
            // =================================================

            const result = await response.json();

            console.log("API response:", result);


            // =================================================
            // DISPLAY PREDICTION
            // =================================================

            const prediction =
                parseFloat(result.prediction);


            document.getElementById("predictionValue")
                .textContent = prediction.toFixed(2);


            document.getElementById("result")
                .classList.remove("d-none");

        }


        catch (error) {

            console.error(error);


            const errorBox =
                document.getElementById("errorMessage");


            errorBox.textContent =
                "Error: " + error.message;


            errorBox.classList.remove("d-none");

        }


        finally {

            // Hide loading

            document
                .getElementById("loading")
                .classList.add("d-none");


            // Enable button

            button.disabled = false;

        }

    });