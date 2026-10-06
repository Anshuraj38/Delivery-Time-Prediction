import pickle

with open("models/xgb_best.pkl", "rb") as f:
    data = f.read()

print("Bytes:", len(data))
print("First 20 bytes:", data[:20])