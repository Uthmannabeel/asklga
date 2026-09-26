/** Small form helpers for the staff workspace. */
export function Field({ label, name, value, type = "text", hint, required, placeholder, className }: { label: string; name: string; value?: string | number | null; type?: string; hint?: string; required?: boolean; placeholder?: string; className?: string }) {
  const id = `f-${name}`;
  return (
    <div className={`grid gap-1 ${className ?? ""}`}>
      <label htmlFor={id} className="small">{label}{required ? " (required)" : ""}</label>
      <input id={id} name={name} type={type} defaultValue={value ?? ""} required={required} placeholder={placeholder} />
      {hint ? <span className="small muted">{hint}</span> : null}
    </div>
  );
}

export function Area({ label, name, value, rows = 3, hint, required }: { label: string; name: string; value?: string | null; rows?: number; hint?: string; required?: boolean }) {
  const id = `f-${name}`;
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="small">{label}{required ? " (required)" : ""}</label>
      <textarea id={id} name={name} rows={rows} defaultValue={value ?? ""} required={required} />
      {hint ? <span className="small muted">{hint}</span> : null}
    </div>
  );
}

export function Select({ label, name, value, options, hint }: { label: string; name: string; value?: string | null; options: [string, string][]; hint?: string }) {
  const id = `f-${name}`;
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="small">{label}</label>
      <select id={id} name={name} defaultValue={value ?? options[0]?.[0]}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {hint ? <span className="small muted">{hint}</span> : null}
    </div>
  );
}

export function SourceFields({ source, sourceUrl, approval, lastVerified }: { source?: string | null; sourceUrl?: string | null; approval?: string | null; lastVerified?: string | null }) {
  return (
    <fieldset className="grid gap-3 border border-rule p-3" style={{ borderRadius: 2 }}>
      <legend className="small font-bold px-1">Source and approval</legend>
      <Field label="Source" name="source" value={source} required hint="The budget, notice, minutes or site visit this record comes from." />
      <Field label="Source link" name="sourceUrl" value={sourceUrl} type="url" />
      <div className="grid gap-3 md:grid-cols-2">
        <Select label="Approval" name="approval" value={approval ?? "draft"} options={[["draft", "Draft (not public, not used in answers)"], ["approved", "Approved (public, used in answers)"]]} />
        <Field label="Last verified" name="lastVerified" value={lastVerified} type="date" hint="Date the data owner confirmed this record." />
      </div>
    </fieldset>
  );
}
