import { forwardRef, useId, useState, useMemo } from 'react';
import Icon from './Icon.jsx';
import { IconButton } from './primitives.jsx';

/**
 * Campos de formulário.
 *
 * Três regras, todas de acessibilidade:
 *  - todo campo tem rótulo visível (placeholder não é rótulo);
 *  - a mensagem de erro é ligada ao campo por aria-describedby e anunciada;
 *  - o estado de erro nunca depende só da cor — há ícone e texto.
 */

function FieldShell({ id, label, hint, error, required, children, className = '', wide }) {
  return (
    <div className={`field ${error ? 'is-invalid' : ''} ${wide ? 'field--wide' : ''} ${className}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={id}>
          {label}
          {required ? <span className="field__required" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">
          <Icon name="alert-triangle" size={12} />
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={`${id}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}

export const TextField = forwardRef(function TextField(
  { label, hint, error, required, icon, suffix, className, wide, ...rest }, ref,
) {
  const generated = useId();
  const id = rest.id ?? generated;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className} wide={wide}>
      <div className="field__control">
        {icon ? <Icon name={icon} size={15} className="field__icon" /> : null}
        <input
          ref={ref}
          id={id}
          className={`input ${icon ? 'has-icon' : ''} ${suffix ? 'has-suffix' : ''}`.trim()}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-required={required || undefined}
          onWheel={(e) => {
            if (rest.type === 'number') {
              e.currentTarget.blur();
            }
            rest.onWheel?.(e);
          }}
          {...rest}
        />
        {suffix ? <span className="field__suffix">{suffix}</span> : null}
      </div>
    </FieldShell>
  );
});

export const PasswordField = forwardRef(function PasswordField(
  { label, hint, error, required, className, ...rest }, ref,
) {
  const generated = useId();
  const id = rest.id ?? generated;
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="field__control">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          className="input has-trailing"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...rest}
        />
        <IconButton
          name={visible ? 'eye-off' : 'eye'}
          label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          size="sm"
          className="field__trailing"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
        />
      </div>
    </FieldShell>
  );
});

export const TextArea = forwardRef(function TextArea(
  { label, hint, error, required, rows = 4, className, wide, counter, maxLength, value, ...rest }, ref,
) {
  const generated = useId();
  const id = rest.id ?? generated;
  const length = String(value ?? '').length;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className} wide={wide}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        className="input input--textarea"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {counter && maxLength ? (
        <span className="field__counter num">{length}/{maxLength}</span>
      ) : null}
    </FieldShell>
  );
});

export const Select = forwardRef(function Select(
  { label, hint, error, required, options = [], placeholder, className, wide, children, ...rest }, ref,
) {
  const generated = useId();
  const id = rest.id ?? generated;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className} wide={wide}>
      <div className="field__control">
        <select
          ref={ref}
          id={id}
          className="input input--select"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {children ?? options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <Icon name="chevron-down" size={14} className="field__chevron" />
      </div>
    </FieldShell>
  );
});

/**
 * Combobox com busca — usado para CID-10, medicamentos e listas longas em que
 * rolar um <select> nativo seria tortura.
 */
export function Combobox({
  label, hint, error, required, options = [], value, onChange,
  placeholder = 'Digite para buscar…', emptyMessage = 'Nenhum resultado.', className, wide,
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 40);
    return options
      .filter((o) => `${o.label} ${o.value} ${o.keywords ?? ''}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [options, query]);

  function choose(option) {
    onChange?.(option.value, option);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setHighlighted((i) => Math.min(i + 1, filtered.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setHighlighted((i) => Math.max(i - 1, 0)); }
    if (event.key === 'Enter' && open && filtered[highlighted]) { event.preventDefault(); choose(filtered[highlighted]); }
    if (event.key === 'Escape') { setOpen(false); }
  }

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className} wide={wide}>
      <div className="combobox">
        <div className="field__control">
          <input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-invalid={error ? 'true' : undefined}
            className="input"
            placeholder={selected ? selected.label : placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlighted(0); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 140)}
            onKeyDown={onKeyDown}
          />
          {selected && !query ? (
            <IconButton name="x" label="Limpar seleção" size="sm" className="field__trailing"
              onClick={() => onChange?.(null, null)} tabIndex={-1} />
          ) : (
            <Icon name="search" size={14} className="field__chevron" />
          )}
        </div>

        {open ? (
          <ul className="combobox__list" id={`${id}-list`} role="listbox">
            {filtered.length ? filtered.map((option, index) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={index === highlighted ? 'is-highlighted' : ''}
                  onMouseEnter={() => setHighlighted(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(option)}
                >
                  <span className="combobox__label">{option.label}</span>
                  {option.hint ? <span className="combobox__hint">{option.hint}</span> : null}
                </button>
              </li>
            )) : (
              <li className="combobox__empty">{emptyMessage}</li>
            )}
          </ul>
        ) : null}
      </div>
    </FieldShell>
  );
}

export function Checkbox({ label, description, checked, onChange, disabled, ...rest }) {
  const id = useId();
  return (
    <div className="check">
      <input
        type="checkbox"
        id={id}
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked, e)}
        {...rest}
      />
      <label htmlFor={id}>
        <span className="check__label">{label}</span>
        {description ? <span className="check__description">{description}</span> : null}
      </label>
    </div>
  );
}

export function Switch({ label, description, checked, onChange, disabled }) {
  const id = useId();
  return (
    <div className="switch">
      <div className="switch__text">
        <label htmlFor={id} className="switch__label">{label}</label>
        {description ? <span className="switch__description">{description}</span> : null}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={!!checked}
        aria-label={label}
        disabled={disabled}
        className={`switch__control ${checked ? 'is-on' : ''}`}
        onClick={() => onChange?.(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </div>
  );
}

export function RadioGroup({ label, name, options = [], value, onChange, hint, error }) {
  const id = useId();
  return (
    <fieldset className={`radio-group ${error ? 'is-invalid' : ''}`.trim()}>
      <legend className="field__label">{label}</legend>
      <div className="radio-group__items">
        {options.map((option) => (
          <label key={option.value} className={`radio ${value === option.value ? 'is-checked' : ''}`}>
            <input
              type="radio"
              name={name ?? id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange?.(option.value)}
            />
            <span className="radio__dot" aria-hidden="true" />
            <span className="radio__text">
              <span>{option.label}</span>
              {option.description ? <em>{option.description}</em> : null}
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="field__error" role="alert"><Icon name="alert-triangle" size={12} />{error}</p>
        : hint ? <p className="field__hint">{hint}</p> : null}
    </fieldset>
  );
}

/** Linha de campos lado a lado dentro de um formulário. */
export function FieldRow({ children, columns }) {
  return (
    <div className="field-row" style={columns ? { gridTemplateColumns: columns } : undefined}>
      {children}
    </div>
  );
}

/** Seção colapsável de formulário longo — a ficha do paciente usa várias. */
export function FormSection({ title, description, icon, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <section className={`form-section ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="form-section__head"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {icon ? <span className="form-section__icon"><Icon name={icon} size={16} /></span> : null}
        <span className="form-section__text">
          <span className="form-section__title">{title}</span>
          {description ? <span className="form-section__description">{description}</span> : null}
        </span>
        {badge}
        <Icon name="chevron-down" size={16} className="form-section__chevron" />
      </button>
      <div className="form-section__body" id={id} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
