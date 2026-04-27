/**
 * Statik logo: `public/logo.png` üzerinden servis edilir; `size` ile
 * sınıf ölçekleri haritalanır (giriş ekranı için `xl` ayrılmıştır).
 */
const sizes = {
  sm: 'h-9 w-9 min-h-9 min-w-9',
  md: 'h-11 w-11 min-h-11 min-w-11',
  lg: 'h-32 w-32 min-h-[8rem] min-w-[8rem] max-h-[10rem] max-w-[10rem]',
  /** Giriş ekranı — bir tık daha büyük */
  xl: 'h-40 w-40 min-h-40 min-w-40 sm:h-44 sm:w-44 sm:min-h-44 sm:min-w-44 max-h-[12rem] max-w-[12rem]',
};

export default function BrandLogo({ size = 'md', className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="ULVİS"
      loading="eager"
      decoding="async"
      draggable={false}
      className={['shrink-0 rounded-full object-contain object-center bg-transparent', sizes[size], className].filter(Boolean).join(' ')}
    />
  );
}
