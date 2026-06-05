# NH₃ Refrigeration Calculator

FastAPI + CoolProp backend, HTML frontend

## วิธีรัน

```bash
# 1. ติดตั้ง dependencies
pip install -r requirements.txt

# 2. รัน server
uvicorn main:app --reload --port 8000

# 3. เปิด browser
http://localhost:8000
```

## โครงสร้างไฟล์

```
nh3_calc/
├── main.py              ← FastAPI + CoolProp calculations
├── requirements.txt
└── static/
    └── index.html       ← Frontend
```

## Input

| Field | Unit | คำอธิบาย |
|-------|------|-----------|
| Voltage | V | แรงดันไฟฟ้า 3 เฟส |
| Current | A | กระแสไฟฟ้า |
| Power Factor | 0–1 | Power factor |
| SP | kg/cm²g | Suction Pressure |
| ST | °C | Suction Temperature |
| DP | kg/cm²g | Discharge Pressure |
| DT | °C | Discharge Temperature |
| Liquid Temp | °C | อุณหภูมิของเหลวก่อน Expansion Valve |

## Output

- **P_comp** — กำลังคอมเพรสเซอร์ [kW]
- **COP** — Coefficient of Performance
- **Q_e** — Cooling capacity [kW, TR]
- **ṁ** — Mass flow rate [kg/s, kg/h]
- **Q_H** — Heat rejection at condenser [kW]
- **η_isentropic** — Isentropic efficiency ของ compressor [%]
- **h₁–h₄** — Enthalpy ที่แต่ละจุดบน P-h diagram [kJ/kg]
- **SH, SC** — Superheat, Subcool [K]

## API

`POST /calculate` — รับ JSON, คืน JSON

```bash
curl -X POST http://localhost:8000/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "voltage": 385, "current": 196, "power_factor": 0.86,
    "sp": 1.45, "st": -6.40,
    "dp": 14.10, "dt": 94.40,
    "liquid_temp": 30
  }'
```
