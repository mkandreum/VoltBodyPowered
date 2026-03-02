function sanitizeValue(value, key = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (key === 'url' || key === 'profilePhoto' || key === 'motivationPhoto') {
      return trimmed;
    }

    return trimmed.slice(0, 5000);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key));
  }

  if (value && typeof value === 'object') {
    return sanitizeObject(value);
  }

  return value;
}

function sanitizeObject(object) {
  const result = {};

  for (const [key, value] of Object.entries(object)) {
    result[key] = sanitizeValue(value, key);
  }

  return result;
}

export function sanitizeRequestBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
}
