// === services/apiCache.js ===

const CACHE_PREFIX = 'busrideanalyzer_cache_';
const CACHE_VERSION = 'v1_';

// בדיקה האם התאריך הוא היסטורי (לפני היום)
function isHistorical(dateString) {
  const today = new Date().toISOString().split('T')[0];
  return dateString < today;
}

// יצירת מפתח cache ייחודי
function getCacheKey(endpoint, params) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${CACHE_PREFIX}${CACHE_VERSION}${endpoint}_${sortedParams}`;
}

// קריאה מה-cache
export function getFromCache(endpoint, params) {
  try {
    const key = getCacheKey(endpoint, params);
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      console.log(`✅ Cache hit: ${endpoint}`);
      return data;
    }
  } catch (err) {
    console.error('Cache read error:', err);
  }
  return null;
}

// שמירה ב-cache (רק אם היסטורי)
export function saveToCache(endpoint, params, data, dateTo) {
  try {
    // שמור רק אם התאריך היסטורי
    if (dateTo && isHistorical(dateTo)) {
      const key = getCacheKey(endpoint, params);
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      console.log(`💾 Cached: ${endpoint}`);
    }
  } catch (err) {
    console.error('Cache write error:', err);
    // אם localStorage מלא, נקה cache ישן
    if (err.name === 'QuotaExceededError') {
      clearOldCache();
    }
  }
}

// ניקוי cache ישן (מעל 30 יום)
function clearOldCache() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const { timestamp } = JSON.parse(localStorage.getItem(key));
        if (timestamp < thirtyDaysAgo) {
          localStorage.removeItem(key);
        }
      } catch (err) {
        // מחק פריטים פגומים
        localStorage.removeItem(key);
      }
    }
  }
}

// ניקוי ידני של כל ה-cache
export function clearAllCache() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keys.push(key);
    }
  }
  keys.forEach(key => localStorage.removeItem(key));
  console.log(`🗑️ Cleared ${keys.length} cache entries`);
}