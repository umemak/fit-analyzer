/**
 * iOS/iPadOS デバイスを検出
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // iPhone, iPad, iPod
  if (/iphone|ipad|ipod/.test(userAgent)) return true;
  
  // iPad Pro (iPadOS 13+) は MacIntel として識別される
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  
  return false;
}

/**
 * Androidデバイスを検出
 */
export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/.test(navigator.userAgent.toLowerCase());
}

/**
 * Web Share Target API のサポート確認
 */
export function supportsWebShareTarget(): boolean {
  // Android のみサポート（iOS/iPadOS はサポートしない）
  return isAndroid();
}
