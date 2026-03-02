const state = {
  startedAt: new Date().toISOString(),
  totals: {
    requests: 0,
    errors5xx: 0,
    rateLimited: 0,
  },
  routes: {},
  events: {
    authErrors: 0,
    aiErrors: 0,
    validationErrors: 0,
  },
};

function getRouteKey(method, path) {
  return `${method.toUpperCase()} ${path}`;
}

function getOrCreateRoute(method, path) {
  const key = getRouteKey(method, path);
  if (!state.routes[key]) {
    state.routes[key] = {
      count: 0,
      status: {},
      durationMsTotal: 0,
      durationMsAvg: 0,
    };
  }
  return state.routes[key];
}

export function recordRequest({ method, path, statusCode, durationMs }) {
  state.totals.requests += 1;

  if (statusCode >= 500) {
    state.totals.errors5xx += 1;
  }

  const route = getOrCreateRoute(method, path);
  route.count += 1;
  route.durationMsTotal += durationMs;
  route.durationMsAvg = Number((route.durationMsTotal / route.count).toFixed(2));
  route.status[statusCode] = (route.status[statusCode] || 0) + 1;
}

export function incrementRateLimited() {
  state.totals.rateLimited += 1;
}

export function incrementAuthError() {
  state.events.authErrors += 1;
}

export function incrementAiError() {
  state.events.aiErrors += 1;
}

export function incrementValidationError() {
  state.events.validationErrors += 1;
}

export function getMetricsSnapshot() {
  return {
    ...state,
    generatedAt: new Date().toISOString(),
  };
}
