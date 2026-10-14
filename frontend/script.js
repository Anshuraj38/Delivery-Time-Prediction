"use strict";

/* ==========================================================
   CONFIG — edit this block to match your API and training data.
   Every `value` below is sent to the API exactly as written,
   so it must match the category names used when you trained
   the model (they become the one-hot columns).
   ========================================================== */

const CONFIG = {
  apiUrl: "http://127.0.0.1:8000",

  choices: {
    rating: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),

    traffic: [
      { value: "Low", label: "Low" },
      { value: "Medium", label: "Medium" },
      { value: "High", label: "High" },
      { value: "Jam", label: "Jam" },
    ],

    weather: [
      { value: "Sunny", label: "Sunny" },
      { value: "Cloudy", label: "Cloudy" },
      { value: "Fog", label: "Fog" },
      { value: "Windy", label: "Windy" },
      { value: "Stormy", label: "Stormy" },
      { value: "Sandstorms", label: "Sandstorm" },
    ],

    vehicleType: [
      { value: "motorcycle", label: "Motorcycle" },
      { value: "scooter", label: "Scooter" },
      { value: "electric_scooter", label: "Electric scooter" },
      { value: "bicycle", label: "Bicycle" },
    ],

    condition: [0, 1, 2, 3].map((n) => ({ value: n, label: String(n) })),

    multiple: [0, 1, 2, 3].map((n) => ({ value: n, label: String(n) })),

    orderType: [
      { value: "Snack", label: "Snack" },
      { value: "Meal", label: "Meal" },
      { value: "Drinks", label: "Drinks" },
      { value: "Buffet", label: "Buffet" },
    ],

    festival: [
      { value: "false", label: "No" },
      { value: "true", label: "Yes" },
    ],

    city: [
      { value: "Metropolitian", label: "Metropolitan" },
      { value: "Urban", label: "Urban" },
      { value: "Semi-Urban", label: "Semi-urban" },
    ],
  },

  defaults: {
    rating: 4,
    traffic: "Medium",
    weather: "Sunny",
    vehicleType: "motorcycle",
    condition: 2,
    multiple: 1,
    orderType: "Meal",
    festival: "false",
    city: "Metropolitian",
  },

  requestTimeoutMs: 15000,
};

/* ---------- Helpers ---------- */

const $ = (selector, root = document) => root.querySelector(selector);

const form = $("#predict-form");
const submitBtn = $("#submit-btn");
const result = $("#result");
const minutesValue = $("#minutes-value");
const minutesUnit = $("#minutes-unit");
const summary = $("#summary");
const facts = $("#facts");
const message = $("#message");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function formatHour(hour) {
  const h = ((Math.round(hour) % 24) + 24) % 24;
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${suffix}`;
}

function formatClock(totalMinutes) {
  const m = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = String(m % 60).padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${min} ${suffix}`;
}

/* ---------- Render the radio groups from CONFIG ---------- */

function renderChoices() {
  document.querySelectorAll(".choices").forEach((group) => {
    const name = group.dataset.group;
    const items = CONFIG.choices[name] || [];
    const fallback = String(CONFIG.defaults[name]);

    group.innerHTML = items
      .map(
        (item) => `
        <label class="choice">
          <input type="radio" name="${name}" value="${item.value}"
                 ${String(item.value) === fallback ? "checked" : ""} required>
          <span>${item.label}</span>
        </label>`
      )
      .join("");
  });
}

/* ---------- Sliders ---------- */

function updateSliders() {
  const distance = $("#distance");
  const hour = $("#hour");

  [distance, hour].forEach((slider) => {
    const min = Number(slider.min);
    const max = Number(slider.max);
    const pct = ((Number(slider.value) - min) / (max - min)) * 100;
    slider.style.setProperty("--p", `${pct}%`);
  });

  $("#distance-out").textContent = `${Number(distance.value).toFixed(1)} km`;
  $("#hour-out").textContent = formatHour(Number(hour.value));
}

/* ---------- API status ---------- */

async function checkApi() {
  const box = $("#api-status");
  const text = $("#api-status-text");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${CONFIG.apiUrl}/`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(String(res.status));
    box.dataset.state = "online";
    text.textContent = "Service online";
  } catch {
    box.dataset.state = "offline";
    text.textContent = "Service offline";
  }
}

/* ---------- Route animation ---------- */

const routePath = $("#route-path");
const routeTrail = $("#route-trail");
const pin = $("#pin");
const routeLength = routePath.getTotalLength();
let animationFrame = null;

routeTrail.style.strokeDasharray = routeLength;

function setRouteProgress(p) {
  routeTrail.style.strokeDashoffset = routeLength * (1 - p);
  const point = routePath.getPointAtLength(routeLength * p);
  pin.setAttribute("transform", `translate(${point.x} ${point.y})`);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateResult(targetMinutes) {
  cancelAnimationFrame(animationFrame);

  if (reduceMotion.matches) {
    setRouteProgress(1);
    minutesValue.textContent = String(targetMinutes);
    return;
  }

  const duration = 1300;
  const start = performance.now();

  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = easeOutCubic(t);
    setRouteProgress(eased);
    minutesValue.textContent = String(Math.round(targetMinutes * eased));
    if (t < 1) animationFrame = requestAnimationFrame(tick);
  };
  animationFrame = requestAnimationFrame(tick);
}

/* ---------- Result states ---------- */

function showMessage(text) {
  message.textContent = text;
  message.hidden = !text;
}

function setIdle() {
  cancelAnimationFrame(animationFrame);
  result.dataset.state = "idle";
  setRouteProgress(0);
  minutesValue.textContent = "—";
  minutesUnit.textContent = "";
  summary.textContent = "Set the details, then choose Estimate delivery time.";
  facts.hidden = true;
  showMessage("");
}

function setLoading() {
  cancelAnimationFrame(animationFrame);
  result.dataset.state = "loading";
  setRouteProgress(0);
  minutesValue.textContent = "—";
  minutesUnit.textContent = "";
  summary.textContent = "Estimating…";
  facts.hidden = true;
  showMessage("");
}

function setError(text) {
  cancelAnimationFrame(animationFrame);
  result.dataset.state = "error";
  setRouteProgress(0);
  minutesValue.textContent = "—";
  minutesUnit.textContent = "";
  summary.textContent = "No estimate yet.";
  facts.hidden = true;
  showMessage(text);
}

function setSuccess(minutes, payload) {
  result.dataset.state = "success";
  showMessage("");

  const rounded = Math.max(0, Math.round(minutes));
  minutesUnit.textContent = "min";

  const arrivalMinutes = payload.order_hour * 60 + rounded;
  const nextDay = arrivalMinutes >= 1440;
  summary.innerHTML = `Placed at <strong>${formatHour(payload.order_hour)}</strong>, it should arrive around <strong>${formatClock(arrivalMinutes)}</strong>${nextDay ? " the next day" : ""}.`;

  const pace = rounded > 0 ? payload.distance_km / (rounded / 60) : 0;
  $("#fact-distance").textContent = `${payload.distance_km.toFixed(1)} km`;
  $("#fact-pace").textContent = `${pace.toFixed(0)} km/h`;
  $("#fact-traffic").textContent = payload.Road_traffic_density;
  facts.hidden = false;

  animateResult(rounded);
}

/* ---------- Request ---------- */

// The API is case-sensitive ("Jam" works, "jam" silently becomes NaN),
// so every category is converted to the exact spelling listed in CONFIG,
// whatever capitalization it arrives in.
function canonical(group, raw) {
  const wanted = String(raw).trim().toLowerCase();
  const match = CONFIG.choices[group].find(
    (item) => String(item.value).toLowerCase() === wanted
  );
  if (!match) throw new Error(`"${raw}" is not a valid option for ${group}.`);
  return match.value;
}

function buildPayload() {
  const data = new FormData(form);
  return {
    Delivery_person_Age: parseInt(data.get("age"), 10),
    Delivery_person_Ratings: parseInt(data.get("rating"), 10),
    distance_km: parseFloat(data.get("distance")),
    order_hour: parseFloat(data.get("hour")),
    Weatherconditions: canonical("weather", data.get("weather")),
    Road_traffic_density: canonical("traffic", data.get("traffic")),
    Vehicle_condition: parseInt(data.get("condition"), 10),
    Type_of_order: canonical("orderType", data.get("orderType")),
    Type_of_vehicle: canonical("vehicleType", data.get("vehicleType")),
    multiple_deliveries: parseInt(data.get("multiple"), 10),
    Festival: data.get("festival") === "true",
    City: canonical("city", data.get("city")),
  };
}

function describeError(status, body) {
  if (status === 422 && body && Array.isArray(body.detail)) {
    const lines = body.detail.map((d) => {
      const field = (d.loc || []).slice(1).join(".") || "input";
      return `${field}: ${d.msg}`;
    });
    return `The API rejected these values. ${lines.join("; ")}`;
  }
  if (status >= 500) {
    return "The model returned an error. Check the API terminal for details, such as a category that was not in the training data.";
  }
  return `The API responded with status ${status}.`;
}

async function requestPrediction(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

  try {
    const res = await fetch(`${CONFIG.apiUrl}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let body = null;
    try { body = await res.json(); } catch { /* non-JSON error body */ }

    if (!res.ok) throw new Error(describeError(res.status, body));
    if (!body || typeof body.prediction !== "number") {
      throw new Error("The API reply did not include a prediction.");
    }
    return body.prediction;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("The request took too long. Check that the API is running and try again.");
    }
    if (err instanceof TypeError) {
      throw new Error(`Can't reach the API at ${CONFIG.apiUrl}. Start the server and check CORS settings.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function onSubmit(event) {
  event.preventDefault();

  let payload;
  try {
    payload = buildPayload();
  } catch (err) {
    setError(err.message);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Estimating…";
  setLoading();

  // Bring the result into view on small screens.
  if (window.matchMedia("(max-width: 900px)").matches) {
    result.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
  }

  try {
    const minutes = await requestPrediction(payload);
    setSuccess(minutes, payload);
    $("#api-status").dataset.state = "online";
    $("#api-status-text").textContent = "Service online";
  } catch (err) {
    setError(err.message);
    if (err instanceof Error && err.message.startsWith("Can't reach")) {
      $("#api-status").dataset.state = "offline";
      $("#api-status-text").textContent = "Service offline";
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Estimate delivery time";
  }
}

/* ---------- Init ---------- */

renderChoices();
updateSliders();
setIdle();
checkApi();

form.addEventListener("submit", onSubmit);
form.addEventListener("input", (e) => {
  if (e.target.classList.contains("slider")) updateSliders();
});
form.addEventListener("reset", () => {
  // Wait for the browser to restore default values first.
  setTimeout(() => {
    updateSliders();
    setIdle();
  }, 0);
});