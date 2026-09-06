import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges conditional classes and resolves Tailwind conflicts (last one wins). */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
