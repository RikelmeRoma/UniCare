import { useId } from 'react';
import type { ReactNode } from 'react';
import { CAMPO, ROTULO, TITULO_SECAO } from './estilos';
import { OPCOES_SIM_NAO } from './tipos';
import type { Opcao, SimNao } from './tipos';
import { alternarValor } from './estado';

interface SectionCardProps {
  numero: number | string;
  titulo: string;
  pagina?: string;
  descricao?: string;
  id?: string;
  children: ReactNode;
}

export function SectionCard({
  numero,
  titulo,
  pagina,
  descricao,
  id,
  children,
}: SectionCardProps) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
    >
      <header className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
          {typeof numero === 'number' ? String(numero).padStart(2, '0') : numero}
        </span>
        <div>
          {pagina && (
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {pagina}
            </p>
          )}
          <h3 className={TITULO_SECAO}>{titulo}</h3>
          {descricao && (
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{descricao}</p>
          )}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  type?: 'text' | 'date' | 'number' | 'tel' | 'time' | 'datetime-local';
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'decimal';
  disabled?: boolean;
  className?: string;
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  inputMode,
  disabled,
  className,
}: FieldProps) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className={ROTULO}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        className={CAMPO}
      />
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  acao?: ReactNode;
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  acao,
}: TextAreaFieldProps) {
  const id = useId();

  return (
    <div className={className}>
      {acao ? (
        <div className="mb-1 flex items-center justify-between gap-2">
          <label
            htmlFor={id}
            className="block text-[11px] font-bold text-slate-600"
          >
            {label}
          </label>
          {acao}
        </div>
      ) : (
        <label htmlFor={id} className={ROTULO}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${CAMPO} resize-y leading-relaxed`}
      />
    </div>
  );
}

interface RadioGroupProps<T extends string> {
  label?: string;
  valor: T | '';
  opcoes: Opcao<T>[];
  onChange: (valor: T) => void;
  className?: string;
}

export function RadioGroup<T extends string>({
  label,
  valor,
  opcoes,
  onChange,
  className,
}: RadioGroupProps<T>) {
  const nome = useId();

  return (
    <div className={className}>
      {label && <span className={ROTULO}>{label}</span>}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {opcoes.map((opcao) => {
          const ativo = valor === opcao.valor;
          return (
            <label
              key={opcao.valor}
              className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                ativo
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <input
                type="radio"
                name={nome}
                className="sr-only"
                checked={ativo}
                onChange={() => onChange(opcao.valor)}
              />
              {opcao.rotulo}
            </label>
          );
        })}
      </div>
    </div>
  );
}

interface YesNoGroupProps {
  label: string;
  valor: SimNao | '';
  onChange: (valor: SimNao) => void;
  className?: string;
}

export function YesNoGroup({ label, valor, onChange, className }: YesNoGroupProps) {
  return (
    <RadioGroup
      label={label}
      valor={valor}
      opcoes={OPCOES_SIM_NAO}
      onChange={onChange}
      className={className}
    />
  );
}

interface CheckboxGroupProps {
  label: string;
  opcoes: string[];
  valores: string[];
  onChange: (valores: string[]) => void;
  className?: string;
}

export function CheckboxGroup({
  label,
  opcoes,
  valores,
  onChange,
  className,
}: CheckboxGroupProps) {
  return (
    <div className={className}>
      <span className={ROTULO}>{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((opcao) => {
          const ativo = valores.includes(opcao);
          return (
            <label
              key={opcao}
              className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                ativo
                  ? 'border-slate-900 bg-slate-100 text-slate-900'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={ativo}
                onChange={() => onChange(alternarValor(valores, opcao))}
              />
              {ativo ? '✓ ' : ''}
              {opcao}
            </label>
          );
        })}
      </div>
    </div>
  );
}

interface InlineInputProps {
  rotulo?: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  className?: string;
}

export function InlineInput({
  rotulo = 'Outros',
  value,
  onChange,
  placeholder,
  className,
}: InlineInputProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <span className="shrink-0 text-[11px] font-bold text-slate-500">{rotulo}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={CAMPO}
      />
    </div>
  );
}

export function SubTitulo({ children }: { children: ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
      {children}
    </h4>
  );
}

interface InlineTextInputProps {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
}

export function InlineTextInput({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
}: InlineTextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={`rounded-md border-b border-slate-300 bg-transparent px-1 py-0.5 text-xs font-semibold text-slate-900 outline-none transition-colors focus:border-slate-800 ${className ?? ''}`}
    />
  );
}

interface SignatureFieldProps {
  label: string;
  value: string;
  onChange: (valor: string) => void;
}

export function SignatureField({ label, value, onChange }: SignatureFieldProps) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b border-slate-400 bg-transparent px-2 pb-1 pt-6 text-center text-xs font-semibold text-slate-900 outline-none focus:border-slate-800"
      />
      <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
    </div>
  );
}
