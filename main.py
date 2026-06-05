from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from CoolProp.CoolProp import PropsSI
from pathlib import Path
from typing import Optional

app = FastAPI(title="NH3 Refrigeration Calculator")

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def root():
    return FileResponse(STATIC_DIR / "index.html")


class CalcInput(BaseModel):
    current: float               # A (required)
    sp: float                    # Suction Pressure kg/cm²g (required)
    dp: float                    # Discharge Pressure kg/cm²g (required)
    st: Optional[float] = None   # Suction Temp °C — ถ้าไม่กรอก assume SH=5K
    dt: Optional[float] = None   # Discharge Temp °C — ถ้าไม่กรอก ใช้ η_is=0.7
    liquid_temp: Optional[float] = None  # Liquid Temp °C — ถ้าไม่กรอก assume SC=0
    # override defaults
    sh_default: float = 5.0      # K
    eta_is: float = 0.70         # isentropic efficiency
    voltage: float = 385.0
    power_factor: float = 0.86


def kgcm2g_to_Pa(p: float) -> float:
    return (p * 98066.5) + 101325


@app.post("/calculate")
def calculate(data: CalcInput):
    fluid = "Ammonia"

    # ── 1. P_comp ──────────────────────────────────────────────────────
    P_comp_kW = (1.732 * data.voltage * data.current * data.power_factor) / 1000

    # ── 2. Pressures ───────────────────────────────────────────────────
    P_low  = kgcm2g_to_Pa(data.sp)
    P_high = kgcm2g_to_Pa(data.dp)

    # ── 3. Saturation temps ────────────────────────────────────────────
    T_evap = PropsSI("T", "P", P_low,  "Q", 1, fluid) - 273.15
    T_cond = PropsSI("T", "P", P_high, "Q", 0, fluid) - 273.15

    # ── 4. h1: SH จริงหรือ assume ──────────────────────────────────────
    if data.st is not None:
        SH = data.st - T_evap
        h1 = PropsSI("H", "P", P_low, "T", data.st + 273.15, fluid) / 1000
        st_used = data.st
        sh_mode = "measured"
    else:
        SH = data.sh_default
        T1_K = T_evap + 273.15 + SH
        h1 = PropsSI("H", "P", P_low, "T", T1_K, fluid) / 1000
        st_used = T_evap + SH
        sh_mode = "assumed"

    # ── 5. h2: DT จริงหรือ η_is ────────────────────────────────────────
    s1 = PropsSI("S", "P", P_low, "T", (T_evap + SH) + 273.15, fluid)
    h2s = PropsSI("H", "P", P_high, "S", s1, fluid) / 1000
    T2s_C = PropsSI("T", "P", P_high, "S", s1, fluid) - 273.15

    if data.dt is not None:
        h2 = PropsSI("H", "P", P_high, "T", data.dt + 273.15, fluid) / 1000
        eta_is_actual = (h2s - h1) / (h2 - h1) if (h2 - h1) != 0 else None
        dt_used = data.dt
        dt_mode = "measured"
    else:
        h2 = h1 + (h2s - h1) / data.eta_is
        eta_is_actual = data.eta_is
        dt_used = PropsSI("T", "P", P_high, "H", h2 * 1000, fluid) - 273.15
        dt_mode = "assumed"

    # ── 6. h3: SC จริงหรือ assume SC=0 ─────────────────────────────────
    hf_cond = PropsSI("H", "P", P_high, "Q", 0, fluid) / 1000

    if data.liquid_temp is not None:
        SC = T_cond - data.liquid_temp
        h3 = PropsSI("H", "P", P_high, "T", data.liquid_temp + 273.15, fluid) / 1000
        liq_mode = "measured"
    else:
        SC = 0.0
        h3 = hf_cond
        liq_mode = "assumed"

    h4 = h3

    # ── 7. Performance ─────────────────────────────────────────────────
    q_L    = h1 - h4
    w_comp = h2 - h1
    q_H    = h2 - h3
    COP    = q_L / w_comp
    Q_e    = P_comp_kW * COP
    Q_H_kW = P_comp_kW + Q_e
    m_dot  = Q_e / q_L
    TR     = Q_e / 3.517

    # ── 8. Warnings ────────────────────────────────────────────────────
    warnings = []
    if SH < 0:
        warnings.append({"level":"danger","msg":f"Superheat = {SH:.1f} K — มีของเหลวเข้า compressor! ตรวจ EXV ด่วน"})
    if SH > 30:
        warnings.append({"level":"warning","msg":f"Superheat สูง ({SH:.1f} K) — ตรวจ refrigerant charge หรือ EXV"})
    if SC < 0:
        warnings.append({"level":"danger","msg":f"Subcool = {SC:.1f} K — flash ก่อน expansion valve"})
    if COP < 1.5:
        warnings.append({"level":"warning","msg":f"COP = {COP:.2f} — ต่ำกว่าปกติ ตรวจ T_cond / T_evap"})
    if eta_is_actual and eta_is_actual < 0.55:
        warnings.append({"level":"warning","msg":f"Isentropic efficiency = {eta_is_actual*100:.1f}% — ต่ำมาก ตรวจ compressor"})

    return {
        "modes": {
            "sh_mode": sh_mode,
            "dt_mode": dt_mode,
            "liq_mode": liq_mode,
            "st_used": round(st_used, 2),
            "dt_used": round(dt_used, 2),
        },
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
            "h1": round(h1, 2), "h2": round(h2, 2),
            "h3": round(h3, 2), "h4": round(h4, 2),
            "h2s": round(h2s, 2), "T2s_degC": round(T2s_C, 2),
        },
        "performance": {
            "P_comp_kW":  round(P_comp_kW, 3),
            "q_L":        round(q_L, 2),
            "w_comp":     round(w_comp, 2),
            "q_H":        round(q_H, 2),
            "COP":        round(COP, 4),
            "Q_e_kW":     round(Q_e, 3),
            "Q_H_kW":     round(Q_H_kW, 3),
            "TR":         round(TR, 2),
            "m_dot_kgs":  round(m_dot, 5),
            "m_dot_kgh":  round(m_dot * 3600, 2),
            "eta_isentropic": round(eta_is_actual * 100, 1) if eta_is_actual else None,
        },
        "warnings": warnings,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)