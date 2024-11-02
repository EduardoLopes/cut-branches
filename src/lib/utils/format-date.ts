import { format, type DateArg } from 'date-fns';

export function formatDate(date: DateArg<Date> & {}): string {
	return format(date, 'PPPP');
}
