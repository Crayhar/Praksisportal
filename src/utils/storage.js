export function loadStoredJson(key, fallbackValue) {
  if (typeof window === 'undefined') {
    return fallbackValue;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch (error) {
    console.error(`Failed to load localStorage key "${key}"`, error);
    return fallbackValue;
  }
}

export function saveStoredJson(key, value) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save localStorage key "${key}"`, error);
  }
}
