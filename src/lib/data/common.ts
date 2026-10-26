const DAY = 86_400_000;

export function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY).toISOString();
}

export function daysAhead(n: number) {
  return new Date(Date.now() + n * DAY).toISOString();
}

export function hoursAhead(n: number) {
  return new Date(Date.now() + n * 3_600_000).toISOString();
}
