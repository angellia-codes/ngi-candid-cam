import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gold text-ink hover:brightness-110 active:brightness-95',
  ghost: 'border border-cream/40 text-cream hover:border-cream',
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      {...rest}
      className={`min-h-12 rounded-full px-6 font-label text-lg uppercase tracking-wider transition disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${VARIANTS[variant]} ${className}`}
    />
  );
}
