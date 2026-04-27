/**
 * Erişilebilirlik: açıkken `body` taşması kapatılır, Escape dinlenir;
 * dışa tıklama: çağırana bırakılır (burada sadece çocuk tıkaması durdurulur).
 */
import { useEffect } from 'react';
import { HiOutlineX } from 'react-icons/hi';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  /* Açık modalda arka plan kaydırması kilitlenir. */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col animate-slide-up`}>
        <div className="flex items-center justify-between p-5 border-b border-surface-100 flex-shrink-0">
          <h3 className="text-lg font-bold text-surface-800">{title}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-700 p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
