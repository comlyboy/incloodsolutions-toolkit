export function transformText(text: string, format: 'uppercase' | 'lowercase' | 'titlecase' | 'capitalize') {
	if (!text || typeof text === 'object') return text;
	if (format === 'uppercase') {
		text = text.toUpperCase();
	}
	if (format === 'lowercase') {
		text = text.toLowerCase();
	}
	if (format === 'capitalize') {
		text = text.toLowerCase().replace(/\b\w/g, (match: string) => match.toUpperCase());
	}
	if (format === 'titlecase') {
		text = text.replace(/^./, text[0].toUpperCase());
	}
	return text;
}