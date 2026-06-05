export function Field({ label, unit, id, value, onChange, placeholder, required = false, optional = false, assumeText }) {
  const hasVal = value !== ''
  return (
    <div className="field">
      <label>
        <span className="name">{label} {unit && <span className="unit">[{unit}]</span>}</span>
        {optional && (
          <span className={`tag ${hasVal ? 'measured' : 'assume'}`}>
            {hasVal ? 'measured' : assumeText}
          </span>
        )}
      </label>
      <input
        id={id}
        type="number"
        step="any"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={hasVal ? 'measured' : ''}
      />
    </div>
  )
}

export function FieldRow({ children }) {
  return <div className="frow2">{children}</div>
}
