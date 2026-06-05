import { useState } from 'react'
import { Field, FieldRow } from '../components/InputField'
import { ResultCard, DetailTable } from '../components/ResultCard'

const fmt = (v, d = 2) => v != null ? Number(v).toFixed(d) : '—'

export default function TwoStage() {
  const [form, setForm] = useState({
    i_boost: '', sp: '', st: '', dt_b: '',
    t_int: '-7',
    i_high: '', dp: '', dt_h: '', lt: ''
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [warnings, setWarnings] = useState([])

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  async function calculate() {
    if (!form.i_boost || !form.sp || !form.i_high || !form.dp || !form.t_int) {
      alert('กรุณากรอก I_booster, SP, I_high, DP, T_int ให้ครบ'); return
    }
    setLoading(true)
    try {
      const res = await fetch('/calculate_two', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voltage: 385, power_factor: 0.86,
          i_booster: +form.i_boost, sp: +form.sp,
          st: form.st !== '' ? +form.st : null,
          dt_booster: form.dt_b !== '' ? +form.dt_b : null,
          t_int: +form.t_int,
          i_high: +form.i_high, dp: +form.dp,
          dt_high: form.dt_h !== '' ? +form.dt_h : null,
          liquid_temp: form.lt !== '' ? +form.lt : null,
        })
      })
      const d = await res.json()
      setResult(d)
      setWarnings(d.warnings || [])
    } catch (e) { alert('ไม่สามารถเชื่อมต่อ server: ' + e.message) }
    finally { setLoading(false) }
  }

  const p = result?.performance
  const sat = result?.saturation
  const enth = result?.enthalpy
  const m = result?.modes
  const pr = result?.pressures

  return (
    <div>
      {/* Cycle bar */}
      <div className="cycle-bar">
        {[
          { tag: 'Low side', name: 'Evaporator', color: 'var(--blue)' },
          { tag: 'Low stage', name: 'Booster comp', color: 'var(--blue)' },
          { tag: 'Intermediate', name: 'Inter tank', color: 'var(--green)' },
          { tag: 'High stage', name: 'High comp', color: 'var(--purple)' },
          { tag: 'High side', name: 'Condenser', color: 'var(--amber)' },
        ].map((s, i) => (
          <div key={i} className="cycle-step">
            <div className="cs-tag">{s.tag}</div>
            <div className="cs-name" style={{ color: s.color }}>{s.name}</div>
          </div>
        ))}
      </div>

      <div className="cols3">
        {/* Low stage */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-num blue">1</div>
            <h2 style={{ color: 'var(--blue)' }}>Low Stage — Booster</h2>
          </div>
          <div className="panel-body">
            <div className="notice blue">V = 385V · PF = 0.86</div>
            <Field label="I_booster" unit="A" value={form.i_boost} onChange={set('i_boost')} placeholder="เช่น 200" />
            <Field label="SP" unit="kg/cm²g" value={form.sp} onChange={set('sp')} placeholder="เช่น −0.5" />
            <Field label="ST – Suction Temp" unit="°C" value={form.st} onChange={set('st')}
              placeholder="เว้นว่าง → SH=5K" optional assumeText="assume SH=5K" />
            <Field label="DT_booster" unit="°C" value={form.dt_b} onChange={set('dt_b')}
              placeholder="เว้นว่าง → η=0.70" optional assumeText="assume η=0.70" />
          </div>
        </div>

        {/* Intermediate */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-num green">2</div>
            <h2 style={{ color: 'var(--green)' }}>Intermediate (Inter tank)</h2>
          </div>
          <div className="panel-body">
            <div className="notice green">
              Closed intercooler — ไอออก booster ถูก desuperheat<br />
              ออกมาเป็น sat vapor ที่ T_int
            </div>
            <Field label="T_int – Inter tank temp" unit="°C" value={form.t_int} onChange={set('t_int')} placeholder="-7" />
            {result && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginTop: 8, lineHeight: 1.6 }}>
                P_int = {fmt(pr?.P_int_kPa, 1)} kPa abs<br />
                = {fmt(pr?.P_int_kgcm2g, 3)} kg/cm²g
              </div>
            )}
          </div>
        </div>

        {/* High stage */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-num purple">3</div>
            <h2 style={{ color: 'var(--purple)' }}>High Stage</h2>
          </div>
          <div className="panel-body">
            <div className="notice blue">V = 385V · PF = 0.86</div>
            <Field label="I_high" unit="A" value={form.i_high} onChange={set('i_high')} placeholder="เช่น 430" />
            <Field label="DP" unit="kg/cm²g" value={form.dp} onChange={set('dp')} placeholder="เช่น 12.3" />
            <Field label="DT_high" unit="°C" value={form.dt_h} onChange={set('dt_h')}
              placeholder="เว้นว่าง → η=0.70" optional assumeText="assume η=0.70" />
            <Field label="Liquid Temp" unit="°C" value={form.lt} onChange={set('lt')}
              placeholder="เว้นว่าง → SC=0" optional assumeText="assume SC=0" />
          </div>
        </div>
      </div>

      <button className="calc-btn purple" onClick={calculate} disabled={loading}>
        {loading ? 'กำลังคำนวณ...' : '▶ คำนวณ Two-Stage'}
      </button>

      {result && (
        <>
          {/* Mode badges */}
          <div className="mode-row">
            <span className={`mbadge ${m.sh_mode}`}>{m.sh_mode === 'measured' ? `ST=${fmt(m.st_used,1)}°C` : 'SH=5K (assume)'}</span>
            <span className={`mbadge ${m.dt_b_mode}`}>{m.dt_b_mode === 'measured' ? `DT_b=${fmt(m.dt_b_used,1)}°C` : 'η_b=0.70 (assume)'}</span>
            <span className={`mbadge ${m.dt_h_mode}`}>{m.dt_h_mode === 'measured' ? `DT_h=${fmt(m.dt_h_used,1)}°C` : 'η_h=0.70 (assume)'}</span>
            <span className={`mbadge ${m.liq_mode}`}>{m.liq_mode === 'measured' ? `SC=${fmt(sat.subcool,1)}K` : 'SC=0 (assume)'}</span>
          </div>

          {/* Top cards */}
          <div className="rcards c4">
            <ResultCard label="COP System" value={fmt(p.COP_system, 3)} sub="Q_e / W_total" color="purple" />
            <ResultCard label="Q_e Cooling" value={fmt(p.Q_e_kW, 1)} unit="kW" sub={`${fmt(p.Q_e_TR, 1)} TR`} color="blue" />
            <ResultCard label="W_total" value={fmt(p.W_total_kW, 1)} unit="kW" sub={`Booster ${fmt(p.W_booster_kW,1)} + High ${fmt(p.W_high_kW,1)}`} color="amber" />
            <ResultCard label="Q_cond" value={fmt(p.Q_cond_kW, 1)} unit="kW" color="purple" />
          </div>
          <div className="rcards c3">
            <ResultCard label="W_booster" value={fmt(p.W_booster_kW, 1)} unit="kW" sub={`η=${fmt(p.eta_booster,1)}%`} color="blue" />
            <ResultCard label="W_high" value={fmt(p.W_high_kW, 1)} unit="kW" sub={`η=${fmt(p.eta_high,1)}%`} color="purple" />
            <ResultCard label="ṁ_low / ṁ_high" value={`${fmt(p.m_low_kgh,0)} / ${fmt(p.m_high_kgh,0)}`} unit="kg/h" sub={`ratio = ${fmt(p.ratio_mh_ml,3)}`} color="green" />
          </div>

          {/* Warnings */}
          {warnings.map((w, i) => <div key={i} className={`wbox ${w.level}`}>⚠ {w.msg}</div>)}

          {/* Detail table */}
          <DetailTable sections={[
            {
              title: 'Pressures',
              rows: [
                { label: 'P_low', value: `${fmt(pr.P_low_kPa,1)} kPa abs` },
                { label: 'P_int จาก T_int', value: `${fmt(pr.P_int_kPa,1)} kPa abs = ${fmt(pr.P_int_kgcm2g,3)} kg/cm²g` },
                { label: 'P_high', value: `${fmt(pr.P_high_kPa,1)} kPa abs` },
              ]
            },
            {
              title: 'Saturation',
              rows: [
                { label: 'T_evap จาก SP', value: `${fmt(sat.T_evap,2)} °C` },
                { label: 'T_int (specify)', value: `${fmt(sat.T_int,1)} °C` },
                { label: 'T_cond จาก DP', value: `${fmt(sat.T_cond,2)} °C` },
                { label: 'Superheat', value: `${fmt(sat.superheat,2)} K`, warn: sat.superheat < 0 ? 'var(--red)' : sat.superheat > 25 ? 'var(--amber)' : null },
                { label: 'Subcool', value: `${fmt(sat.subcool,2)} K`, warn: sat.subcool < 0 ? 'var(--red)' : null },
              ]
            },
            {
              title: 'Enthalpy (kJ/kg)',
              rows: [
                { label: 'h1 — เข้า Booster', value: `${fmt(enth.h1,2)}` },
                { label: 'h2 — ออก Booster (actual)', value: `${fmt(enth.h2,2)}` },
                { label: 'h2s — isentropic booster', value: `${fmt(enth.h2s_b,2)}` },
                { label: 'η_booster', value: p.eta_booster != null ? `${fmt(p.eta_booster,1)} %` : '—' },
                { label: 'h3 — ออก Inter tank (sat vap)', value: `${fmt(enth.h3,2)}` },
                { label: 'h4 — ออก High stage (actual)', value: `${fmt(enth.h4,2)}` },
                { label: 'h4s — isentropic high', value: `${fmt(enth.h4s,2)}` },
                { label: 'η_high stage', value: p.eta_high != null ? `${fmt(p.eta_high,1)} %` : '—' },
                { label: 'h5 — ออก Condenser', value: `${fmt(enth.h5,2)}` },
                { label: 'h6 = h5 — หลัง EXV → Inter tank', value: `${fmt(enth.h6,2)}` },
                { label: 'hf_int — sat liq at P_int', value: `${fmt(enth.hf_int,2)}` },
                { label: 'h7 = hf_int — หลัง EXV → Evap', value: `${fmt(enth.h7,2)}` },
              ]
            },
            {
              title: 'Mass flow',
              rows: [
                { label: 'ṁ_low', value: `${fmt(p.m_low_kgh,1)} kg/h` },
                { label: 'ṁ_high', value: `${fmt(p.m_high_kgh,1)} kg/h` },
                { label: 'm_high/m_low = (h2−h6)/(h3−h6)', value: fmt(p.ratio_mh_ml,4) },
              ]
            }
          ]} />
        </>
      )}
    </div>
  )
}
