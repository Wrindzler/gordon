import { HiCheck, HiX } from 'react-icons/hi';
import { evaluatePassword } from '../utils/passwordPolicy';

/**
 * Şifre gücü: `evaluatePassword` sonuçlarına göre çubuk ve kural
 * satırları boyanır; boş parolada nötr gri durum gösterilir.
 */
export default function PasswordStrength({ password = '', compact = false, className = '' }) {
  const { results, passedCount, total } = evaluatePassword(password);
  const ratio = total === 0 ? 0 : passedCount / total;

  let barColor = 'bg-red-400';
  let label = 'Zayıf';
  if (ratio >= 1) {
    barColor = 'bg-emerald-500';
    label = 'Güçlü';
  } else if (ratio >= 0.66) {
    barColor = 'bg-amber-400';
    label = 'Orta';
  } else if (ratio >= 0.34) {
    barColor = 'bg-orange-400';
    label = 'Zayıf';
  } else {
    barColor = 'bg-red-400';
    label = 'Çok zayıf';
  }

  return (
    <div className={`mt-2 ${className}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-200`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold text-brand-ink-muted uppercase tracking-wider min-w-[60px] text-right">
          {password.length === 0 ? '—' : label}
        </span>
      </div>
      {!compact && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {results.map((r) => {
            const neutral = password.length === 0;
            const Icon = r.passed && !neutral ? HiCheck : HiX;
            const color = neutral
              ? 'text-gray-400'
              : r.passed
              ? 'text-emerald-600'
              : 'text-red-500';
            return (
              <li key={r.id} className={`flex items-center gap-1.5 ${color}`}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{r.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
