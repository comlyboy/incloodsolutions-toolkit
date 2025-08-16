import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges multiple class name arguments into a single string,
 * intelligently resolving Tailwind CSS class conflicts.
 *
 * @param {...ClassValue[]} klasses - A list of class names or conditional class name objects/arrays.
 * @returns {string} A merged string of class names with Tailwind conflict resolution.
 *
 * @example
 * parseClassnames('bg-red-500', 'text-white', { 'hidden': false, 'block': true })
 * // Returns: 'text-white block'
 */
export function parseClassnames(...klasses: ClassValue[]): string {
	return twMerge(clsx(klasses));
}

/**
 * Returns the current screen size based on the browser's inner width.
 *
 * @returns {'mobile' | 'tablet' | 'desktop'} - The screen size category.
 *
 * @example
 * const screen = getScreenSize(); // 'mobile', 'tablet', or 'desktop'
 */
export function getScreenSize(): 'mobile' | 'tablet' | 'desktop' {
	const width = window.innerWidth;
	if (width < 768) return 'mobile';
	if (width < 1024) return 'tablet';
	return 'desktop';
}
