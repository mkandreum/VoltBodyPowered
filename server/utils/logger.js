export function logInfo(event, data = {}) {
  console.log(JSON.stringify({ level: 'info', event, ...data }));
}

export function logError(event, data = {}) {
  console.error(JSON.stringify({ level: 'error', event, ...data }));
}
