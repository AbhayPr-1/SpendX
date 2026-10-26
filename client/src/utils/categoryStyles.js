export function getBadgeClass(category) {
  const normalized = (category || '').toLowerCase();
  if (normalized.includes('food')) return 'badge-food';
  if (normalized.includes('transport') || normalized.includes('auto')) return 'badge-transport';
  if (normalized.includes('utility') || normalized.includes('bill')) return 'badge-utilities';
  if (normalized.includes('shopping')) return 'badge-shopping';
  if (normalized.includes('entertainment')) return 'badge-entertainment';
  if (normalized.includes('health') || normalized.includes('fitness')) return 'badge-healthcare';
  if (normalized.includes('education')) return 'badge-education';
  if (normalized.includes('travel')) return 'badge-travel';
  return 'badge-misc';
}
