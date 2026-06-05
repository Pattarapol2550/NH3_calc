import { useState } from 'react'
import { Field, FieldRow } from '../components/InputField'
import { ResultCard, DetailTable } from '../components/ResultCard'

const fmt = (v, d = 2) => v != null ? Number(v).toFixed(d) : '—'

function FormulaSection() {
  const [open, setOpen] = useState(false)
  const eq = (children) => (
    <div style={{
      background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:6,
      padding:'9px 13px',fontFamily:'var(--mono)',fontSize:12,
      color:'var(--text)',marginBottom:8,lineHeight:1.9,whiteSpace:'pre-wrap'
    }}>{children}</div>
  )
  const hl = (color, text) => <span style={{color:`var(--${color})`,fontWeight:500}}>{text}</span>
  const dim = (text) => <span style={{color:'var(--text3)',fontSize:11}}>{text}</span>
  const block = (title, color, children) => (
    <div style={{marginBottom:18}}>
      <h3 style={{fontFamily:'var(--mono)',fontSize:10,textTransform:'uppercase',
        letterSpacing:1,color:`var(--${color})`,marginBottom:9,paddingBottom:5,
        borderBottom:'1px solid var(--border)'}}>{title}</h3>
      {children}
    </div>
  )
  return (
    <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden',marginTop:14}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:9,
        padding:'11px 15px',borderBottom:open?'1px solid var(--border)':'none',
        background:'var(--bg3)',cursor:'pointer',userSelect:'none'}}>
        <div className="panel-num amber">f</div>
        <h2 style={{fontSize:13,fontWeight:500}}>สูตรที่ใช้คำนวณ — Formula Reference</h2>
        <span style={{marginLeft:'auto',color:'var(--text3)',transition:'transform .2s',
          transform:open?'rotate(180deg)':'none'}}>▾</span>
      </div>
      {open && (
        <div style={{padding:20}}>
          {block('① Compressor Power (V=385, PF=0.86 คงที่)','blue',
            eq(<>{hl('blue','P_comp')} (kW) = 1.732 × 385 × I × 0.86 ÷ 1000{'\n'}{dim('           = I × 0.5728  (สูตรลัด)')}</>)
          )}
          {block('② Pressure Conversion','green',
            eq(<>{hl('green','P_abs')} (Pa) = (P_gauge × 98066.5) + 101325{'\n'}{dim('// 1 kg/cm² = 98066.5 Pa, Patm = 101325 Pa')}</>)
          )}
          {block('③ Saturation & Enthalpy via CoolProp (NH₃)','green',<>
            {eq(<>
              {hl('green','T_evap')} = PropsSI("T","P",P_low,{'"Q"'},1,"Ammonia") − 273.15{'\n'}
              {hl('green','T_cond')} = PropsSI("T","P",P_high,{'"Q"'},0,"Ammonia") − 273.15{'\n\n'}
              {dim('// ถ้ากรอก ST:')}{'\n'}
              {hl('green','SH')}    = ST − T_evap{'\n'}
              {hl('green','h1')}    = PropsSI("H","P",P_low,"T",ST+273.15,"Ammonia") / 1000{'\n\n'}
              {dim('// ถ้าไม่กรอก ST → assume SH = 5K:')}{'\n'}
              {hl('green','h1')}    = PropsSI("H","P",P_low,"T",T_evap+5+273.15,"Ammonia") / 1000{'\n\n'}
              {dim('// ถ้ากรอก DT:')}{'\n'}
              {hl('green','h2')}    = PropsSI("H","P",P_high,"T",DT+273.15,"Ammonia") / 1000{'\n\n'}
              {dim('// ถ้าไม่กรอก DT → assume η_is = 0.70:')}{'\n'}
              {hl('green','s1')}    = PropsSI("S","P",P_low,"T",T1,"Ammonia"){'\n'}
              {hl('green','h2s')}   = PropsSI("H","P",P_high,"S",s1,"Ammonia") / 1000{'\n'}
              {hl('green','h2')}    = h1 + (h2s − h1) / 0.70{'\n\n'}
              {dim('// ถ้ากรอก Liquid Temp:')}{'\n'}
              {hl('green','SC')}    = T_cond − T_liquid{'\n'}
              {hl('green','h3')}    = PropsSI("H","P",P_high,"T",T_liq+273.15,"Ammonia") / 1000{'\n\n'}
              {dim('// ถ้าไม่กรอก → assume SC = 0:')}{'\n'}
              {hl('green','h3')}    = hf(P_high)  {dim('// sat liquid enthalpy')}{'\n'}
              {hl('green','h4')}    = h3  {dim('// isenthalpic expansion')}
            </>)}
          </>)}
          {block('④ COP & Performance','amber',
            eq(<>
              {hl('amber','COP')}    = (h1 − h4) / (h2 − h1){'\n'}
              {hl('amber','Q_e')}    = P_comp × COP{dim('                [kW]')}{'\n'}
              {hl('amber','Q_H')}    = Q_e + P_comp{dim('              [kW]  energy balance')}{'\n'}
              {hl('amber','ṁ')}      = Q_e / (h1 − h4){dim('           [kg/s]')}
            </>)
          )}
          {block('⑤ Isentropic Efficiency (ถ้ากรอก DT)','blue',<>
            {eq(<>
              {hl('blue','η_is')}  = (h2s − h1) / (h2 − h1){'\n'}
              {dim('// screw comp NH₃ ปกติ η ≈ 0.75–0.85\n// η < 0.65 → ควรตรวจ compressor')}
            </>)}
          </>)}
          <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text3)',marginTop:8,lineHeight:1.7}}>
            • CoolProp ใช้ Helmholtz energy EOS — แม่นเทียบ REFPROP<br/>
            • h₂ จาก DT จริง → COP = actual COP ของเครื่อง<br/>
            • SH &lt; 0 → liquid slugging → ตรวจ EXV ด่วน<br/>
            • SC &lt; 0 → flash gas ก่อน EXV → ประสิทธิภาพลด
          </div>
        </div>
      )}
    </div>
  )
}

export default function SingleStage() {
  const [form, setForm] = useState({ cur: '', sp: '', dp: '', st: '', dt: '', lt: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [warnings, setWarnings] = useState([])

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  async function calculate() {
    if (!form.cur || !form.sp || !form.dp) { alert('กรุณากรอก I, SP, DP ให้ครบ'); return }
    setLoading(true)
    try {
      const res = await fetch('/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voltage: 385, power_factor: 0.86,
          current: +form.cur, sp: +form.sp, dp: +form.dp,
          st: form.st !== '' ? +form.st : null,
          dt: form.dt !== '' ? +form.dt : null,
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
  const inp = result?.inputs

  const shColor = sat?.superheat < 0 ? 'var(--red)' : sat?.superheat > 25 ? 'var(--amber)' : null
  const scColor = sat?.subcool < 0 ? 'var(--red)' : null

  return (
    <div>
      <div className="cols2">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-num blue">1</div>
            <h2>ค่าที่ต้องกรอก</h2>
          </div>
          <div className="panel-body">
            <div className="notice blue">V = 385 V · PF = 0.86 (ค่าคงที่)</div>
            <Field label="Current – I" unit="A" value={form.cur} onChange={set('cur')} placeholder="เช่น 196" />
            <FieldRow>
              <Field label="SP" unit="kg/cm²g" value={form.sp} onChange={set('sp')} placeholder="เช่น 1.45" />
              <Field label="DP" unit="kg/cm²g" value={form.dp} onChange={set('dp')} placeholder="เช่น 14.10" />
            </FieldRow>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-num green">2</div>
            <h2>ค่าเสริม (เว้นว่าง = ใช้ค่า assume)</h2>
          </div>
          <div className="panel-body">
            <Field label="ST – Suction Temp" unit="°C" value={form.st} onChange={set('st')}
              placeholder="เว้นว่าง → assume SH = 5K" optional assumeText="assume SH=5K" />
            <Field label="DT – Discharge Temp" unit="°C" value={form.dt} onChange={set('dt')}
              placeholder="เว้นว่าง → assume η_is = 0.70" optional assumeText="assume η_is=0.70" />
            <Field label="Liquid Temp" unit="°C" value={form.lt} onChange={set('lt')}
              placeholder="เว้นว่าง → assume SC = 0" optional assumeText="assume SC=0" />
          </div>
        </div>
      </div>

      <button className="calc-btn blue" onClick={calculate} disabled={loading}>
        {loading ? 'กำลังคำนวณ...' : '▶ คำนวณ'}
      </button>

      {result && (
        <>
          <div className="mode-row">
            <span className={`mbadge ${m.sh_mode}`}>{m.sh_mode === 'measured' ? `ST=${fmt(m.st_used,1)}°C (measured)` : 'SH=5K (assume)'}</span>
            <span className={`mbadge ${m.dt_mode}`}>{m.dt_mode === 'measured' ? `DT=${fmt(m.dt_used,1)}°C (measured)` : 'η_is=0.70 (assume)'}</span>
            <span className={`mbadge ${m.liq_mode}`}>{m.liq_mode === 'measured' ? `SC=${fmt(sat.subcool,1)}K (measured)` : 'SC=0 (assume)'}</span>
          </div>
          <div className="rcards c4">
            <ResultCard label="P_comp" value={fmt(p.P_comp_kW)} unit="kW" sub={`${form.cur}A × 0.5728`} color="blue" />
            <ResultCard label="COP" value={fmt(p.COP, 3)} sub={`SH ${fmt(sat.superheat,1)}K · SC ${fmt(sat.subcool,1)}K`} color="green" />
            <ResultCard label="Q_e — Cooling" value={fmt(p.Q_e_kW)} unit="kW" sub={`${fmt(p.TR,1)} TR · Q_H=${fmt(p.Q_H_kW,1)}kW`} color="amber" />
            <ResultCard label="ṁ — Mass Flow" value={fmt(p.m_dot_kgs,4)} unit="kg/s" sub={`${fmt(p.m_dot_kgh,1)} kg/h`} color="multi" />
          </div>
          {warnings.map((w, i) => <div key={i} className={`wbox ${w.level}`}>⚠ {w.msg}</div>)}
          <DetailTable sections={[
            { title: 'Conditions used', rows: [
              { label: 'ST used', value: `${fmt(m.st_used,1)} °C (${m.sh_mode})` },
              { label: 'DT used', value: `${fmt(m.dt_used,1)} °C (${m.dt_mode})` },
            ]},
            { title: 'Saturation (CoolProp)', rows: [
              { label: 'T_evap จาก SP', value: `${fmt(sat.T_evap,2)} °C` },
              { label: 'T_cond จาก DP', value: `${fmt(sat.T_cond,2)} °C` },
              { label: 'Superheat', value: `${fmt(sat.superheat,2)} K`, warn: shColor },
              { label: 'Subcool', value: `${fmt(sat.subcool,2)} K`, warn: scColor },
              { label: 'P_low', value: `${fmt(inp.P_low_kPa,1)} kPa abs` },
              { label: 'P_high', value: `${fmt(inp.P_high_kPa,1)} kPa abs` },
            ]},
            { title: 'Enthalpy (CoolProp)', rows: [
              { label: 'h₁ — เข้า compressor', value: `${fmt(enth.h1,2)} kJ/kg` },
              { label: 'h₂ — ออก compressor', value: `${fmt(enth.h2,2)} kJ/kg` },
              { label: 'h₂s — isentropic', value: `${fmt(enth.h2s,2)} kJ/kg` },
              { label: 'η_isentropic', value: p.eta_isentropic != null ? `${fmt(p.eta_isentropic,1)} %` : '—' },
              { label: 'h₃ = h₄ — หลัง condenser', value: `${fmt(enth.h3,2)} kJ/kg` },
            ]},
            { title: 'Output', rows: [
              { label: 'q_L = h₁ − h₄', value: `${fmt(p.q_L,2)} kJ/kg` },
              { label: 'w_comp = h₂ − h₁', value: `${fmt(p.w_comp,2)} kJ/kg` },
              { label: 'Q_H', value: `${fmt(p.Q_H_kW,2)} kW` },
              { label: 'ṁ', value: `${fmt(p.m_dot_kgh,1)} kg/h` },
            ]},
          ]} />
        </>
      )}

      <FormulaSection />
    </div>
  )
}