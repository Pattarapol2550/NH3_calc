https://nh3-calc.onrender.com
# NH₃ Refrigeration Calculator

เครื่องคำนวณระบบทำความเย็น Ammonia (R-717) สำหรับ Single-stage และ Two-stage  
Powered by **CoolProp** (REFPROP-quality NH₃ properties) + **FastAPI** + **React**

---

## Features

- **Single-stage** — คำนวณ P_comp → COP → Q_e → ṁ จาก operating data
- **Two-stage (closed intercooler)** — Booster + High stage แยก I กัน, Inter tank energy balance
- กรอกแค่ค่าที่มี — ค่าที่เว้นว่างใช้ค่า assume อัตโนมัติ (SH=5K, η_is=0.70, SC=0)
- แสดง mode badge ว่าค่าไหน measured / assumed
- สูตรอธิบายครบทุกขั้นตอน กางดูได้ล่างสุดแต่ละหน้า

---

## Input

| Field | Unit | หมายเหตุ |
|-------|------|----------|
| I (booster / high stage) | A | **Required** — V=385, PF=0.86 คงที่ |
| SP — Suction Pressure | kg/cm²g | **Required** |
| DP — Discharge Pressure | kg/cm²g | **Required** |
| T_int — Inter tank temp | °C | **Required (Two-stage)** — default −7°C |
| ST — Suction Temp | °C | Optional → assume SH = 5K |
| DT — Discharge Temp | °C | Optional → assume η_is = 0.70 |
| Liquid Temp | °C | Optional → assume SC = 0 |

## Output

| ค่า | หน่วย |
|-----|-------|
| P_comp / W_booster / W_high | kW |
| COP (system) | — |
| Q_e — Cooling Capacity | kW, TR |
| Q_H / Q_cond | kW |
| ṁ_low / ṁ_high | kg/s, kg/h |
| η_isentropic | % |
| h1–h7, SH, SC, T_evap, T_cond | kJ/kg, K, °C |

---

## วิธีรัน (Local)

```bash
# 1. ติดตั้ง Python dependencies
pip install -r requirements.txt

# 2. รัน server
python main.py

# 3. เปิด browser
http://localhost:8000
```

---

## วิธีแก้ไข Frontend แล้ว Build ใหม่

```bash
cd frontend
npm install        # ครั้งแรกเท่านั้น
npm run build      # build ออกที่ ../static_react/
```

---

## โครงสร้างไฟล์

```
├── main.py                      ← FastAPI backend + serve React
├── requirements.txt
├── static_react/                ← React build output (FastAPI serve จากนี้)
└── frontend/                    ← React source
    ├── src/
    │   ├── App.jsx              ← Router + Nav
    │   ├── App.css              ← Global styles
    │   ├── pages/
    │   │   ├── SingleStage.jsx
    │   │   └── TwoStage.jsx
    │   └── components/
    │       ├── InputField.jsx
    │       ├── ResultCard.jsx
    │       └── FormulaRef.jsx   ← สูตรอธิบาย
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## API Endpoints

```
POST /calculate      ← Single-stage
POST /calculate_two  ← Two-stage
```

ตัวอย่าง Single-stage:
```bash
curl -X POST http://localhost:8000/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "current": 196,
    "sp": 1.45,
    "dp": 14.10,
    "st": -6.4,
    "voltage": 385,
    "power_factor": 0.86
  }'
```
