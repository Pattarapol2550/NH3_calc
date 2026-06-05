export function ResultCard({ label, value, unit, sub, color = 'blue' }) {
  return (
    <div className={`rcard ${color}`}>
      <div className="rl">{label}</div>
      <div className={`rv ${color}`}>
        {value ?? '—'}
        {unit && <span className="ru">{unit}</span>}
      </div>
      {sub && <div className="rsub">{sub}</div>}
    </div>
  )
}

export function DetailTable({ sections }) {
  const [open, setOpen] = React.useState(true)
  return (
    <div className="detail-wrap">
      <div className="detail-header" onClick={() => setOpen(o => !o)}>
        <div className="panel-num green">↓</div>
        <h2>รายละเอียด</h2>
        <span className={`chevron ${open ? 'open' : ''}`}>▾</span>
      </div>
      {open && (
        <table className="dt">
          <tbody>
            {sections.map((sec, i) => (
              <React.Fragment key={i}>
                <tr className="sec"><td colSpan={2}>{sec.title}</td></tr>
                {sec.rows.map((row, j) => (
                  <tr key={j}>
                    <td>{row.label}</td>
                    <td style={row.warn ? { color: row.warn } : {}}>
                      {row.value ?? '—'}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

import React from 'react'
