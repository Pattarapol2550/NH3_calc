from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from CoolProp.CoolProp import PropsSI
from pathlib import Path
import math

app = FastAPI(title="NH3 Refrigeration Calculator")

# Use absolute path so it works regardless of where you run from
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def root():
    return FileResponse(STATIC_DIR / "index.html")


class CalcInput(BaseModel):
    voltage: float       # V
    current: float       # A
    power_factor: float  # PF (0-1)
    sp: float            # Suction Pressure  kg/cm²g
    st: float            # Suction Temp      °C
    dp: float            # Discharge Pressure kg/cm²g
    dt: float            # Discharge Temp    °C
    liquid_temp: float   # Liquid Temp before EXV  °C


def kgcm2g_to_Pa(p_kgcm2g: float) -> float:
    """Convert kg/cm²g (gauge) → Pa absolute"""
    # 1 kg/cm² = 98066.5 Pa, atm = 101325 Pa
    return (p_kgcm2g * 98066.5) + 101325


@app.post("/calculate")
def calculate(data: CalcInput):
    fluid = "Ammonia"

    # ── 1. Compressor power from electrical measurement ──────────────────
    P_comp_kW = (1.732 * data.voltage * data.current * data.power_factor) / 1000

    # ── 2. Pressure conversions ──────────────────────────────────────────
    P_low  = kgcm2g_to_Pa(data.sp)   # Pa abs
    P_high = kgcm2g_to_Pa(data.dp)   # Pa abs

    # ── 3. Saturation temperatures from CoolProp ────────────────────────
    T_evap = PropsSI("T", "P", P_low,  "Q", 1, fluid) - 273.15   # °C
    T_cond = PropsSI("T", "P", P_high, "Q", 0, fluid) - 273.15   # °C

    SH = data.st - T_evap    # Superheat  [K]
    SC = T_cond - data.liquid_temp  # Subcool [K]

    T1_K = data.st + 273.15   # Suction temp in K
    T2_K = data.dt + 273.15   # Discharge temp in K
    T3_K = data.liquid_temp + 273.15

    # ── 4. Enthalpy at each point via CoolProp ───────────────────────────

    # Point 1: Superheated vapor entering compressor (P_low, T_suction)
    h1 = PropsSI("H", "P", P_low,  "T", T1_K, fluid) / 1000   # kJ/kg

    # Point 2: Superheated vapor leaving compressor (P_high, T_discharge)
    h2 = PropsSI("H", "P", P_high, "T", T2_K, fluid) / 1000   # kJ/kg

    # Point 3: Subcooled liquid leaving condenser (P_high, T_liquid)
    h3 = PropsSI("H", "P", P_high, "T", T3_K, fluid) / 1000   # kJ/kg

    # Point 4: After expansion valve — isenthalpic
    h4 = h3

    # ── 5. Cycle performance ─────────────────────────────────────────────
    q_L     = h1 - h4          # Cooling effect        kJ/kg
    w_comp  = h2 - h1          # Compressor work       kJ/kg
    q_H     = h2 - h3          # Heat rejected         kJ/kg

    COP     = q_L / w_comp
    Q_e_kW  = P_comp_kW * COP  # Cooling capacity      kW
    Q_H_kW  = P_comp_kW + Q_e_kW  # Heat rejection     kW
    m_dot   = Q_e_kW / q_L     # Mass flow rate        kg/s
    TR      = Q_e_kW / 3.517   # Ton of Refrigeration

    # ── 6. Extra CoolProp properties ────────────────────────────────────
    s1 = PropsSI("S", "P", P_low,  "T", T1_K, fluid) / 1000   # kJ/kg·K
    s2 = PropsSI("S", "P", P_high, "T", T2_K, fluid) / 1000
    # Isentropic discharge temp & enthalpy (for isentropic efficiency)
    T2s_K  = PropsSI("T", "P", P_high, "S", s1 * 1000, fluid)
    h2s    = PropsSI("H", "P", P_high, "S", s1 * 1000, fluid) / 1000
    eta_is = (h2s - h1) / (h2 - h1) if (h2 - h1) != 0 else None

    # ── 7. Warnings ──────────────────────────────────────────────────────
    warnings = []
    if SH < 0:
        warnings.append({"level": "danger", "msg": f"Superheat = {SH:.1f} K — มีของเหลวเข้า compressor! ตรวจ EXV ด่วน"})
    if SH > 30:
        warnings.append({"level": "warning", "msg": f"Superheat สูง ({SH:.1f} K) — ตรวจ refrigerant charge หรือ EXV"})
    if SC < 0:
        warnings.append({"level": "danger", "msg": f"Subcool = {SC:.1f} K — flash ก่อน expansion valve"})
    if COP < 1.5:
        warnings.append({"level": "warning", "msg": f"COP = {COP:.2f} — ต่ำกว่าปกติ ตรวจ T_cond / T_evap"})
    if eta_is and eta_is < 0.5:
        warnings.append({"level": "warning", "msg": f"Isentropic efficiency = {eta_is*100:.1f}% — ต่ำมาก ตรวจ compressor"})

    return {
        "inputs": {
            "P_low_kPa":  round(P_low / 1000, 2),
            "P_high_kPa": round(P_high / 1000, 2),
        },
        "saturation": {
            "T_evap":    round(T_evap, 2),
            "T_cond":    round(T_cond, 2),
            "superheat": round(SH, 2),
            "subcool":   round(SC, 2),
        },
        "enthalpy": {
            "h1": round(h1, 2),
            "h2": round(h2, 2),
            "h3": round(h3, 2),
            "h4": round(h4, 2),
            "s1": round(s1, 4),
            "s2": round(s2, 4),
            "h2s":      round(h2s, 2),
            "T2s_degC": round(T2s_K - 273.15, 2),
        },
        "performance": {
            "P_comp_kW":  round(P_comp_kW, 3),
            "q_L":        round(q_L, 2),
            "w_comp":     round(w_comp, 2),
            "q_H":        round(q_H, 2),
            "COP":        round(COP, 4),
            "Q_e_kW":     round(Q_e_kW, 3),
            "Q_H_kW":     round(Q_H_kW, 3),
            "TR":         round(TR, 2),
            "m_dot_kgs":  round(m_dot, 5),
            "m_dot_kgh":  round(m_dot * 3600, 2),
            "eta_isentropic": round(eta_is * 100, 1) if eta_is else None,
        },
        "warnings": warnings,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
