// ブラウザ判別ユーティリティ

export interface BrowserInfo {
  name: "chrome" | "safari" | "firefox" | "edge" | "arc" | "chromium" | "unknown";
  displayName: string;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
}

/**
 * 現在のブラウザ情報を取得
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  // Arc Browser の検出（CSS変数チェック）
  const isArc = checkIsArc();

  // iOS の場合
  if (isIOS) {
    if (/CriOS/.test(ua)) {
      return {
        name: isArc ? "arc" : "chrome",
        displayName: isArc ? "Arc（iOS）" : "Chrome（iOS）",
        isIOS: true,
        isAndroid: false,
        isMobile: true,
      };
    }
    if (/FxiOS/.test(ua)) {
      return {
        name: "firefox",
        displayName: "Firefox（iOS）",
        isIOS: true,
        isAndroid: false,
        isMobile: true,
      };
    }
    if (/EdgiOS/.test(ua)) {
      return {
        name: "edge",
        displayName: "Edge（iOS）",
        isIOS: true,
        isAndroid: false,
        isMobile: true,
      };
    }
    // iOS Safari（デフォルト）
    return {
      name: "safari",
      displayName: "Safari（iOS）",
      isIOS: true,
      isAndroid: false,
      isMobile: true,
    };
  }

  // Android の場合
  if (isAndroid) {
    if (/Chrome/.test(ua) && !/Edge/.test(ua)) {
      return {
        name: isArc ? "arc" : "chrome",
        displayName: isArc ? "Arc（Android）" : "Chrome（Android）",
        isIOS: false,
        isAndroid: true,
        isMobile: true,
      };
    }
    if (/Firefox/.test(ua)) {
      return {
        name: "firefox",
        displayName: "Firefox（Android）",
        isIOS: false,
        isAndroid: true,
        isMobile: true,
      };
    }
    if (/Edg/.test(ua)) {
      return {
        name: "edge",
        displayName: "Edge（Android）",
        isIOS: false,
        isAndroid: true,
        isMobile: true,
      };
    }
  }

  // デスクトップの場合
  // Edge（Chromium版）
  if (/Edg/.test(ua)) {
    return {
      name: "edge",
      displayName: "Microsoft Edge",
      isIOS: false,
      isAndroid: false,
      isMobile: false,
    };
  }

  // Firefox
  if (/Firefox/.test(ua)) {
    return {
      name: "firefox",
      displayName: "Firefox",
      isIOS: false,
      isAndroid: false,
      isMobile: false,
    };
  }

  // Safari（macOS）
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    return {
      name: "safari",
      displayName: "Safari",
      isIOS: false,
      isAndroid: false,
      isMobile: false,
    };
  }

  // Arc Browser（デスクトップ）
  if (isArc) {
    return {
      name: "arc",
      displayName: "Arc",
      isIOS: false,
      isAndroid: false,
      isMobile: false,
    };
  }

  // Chrome / Chromiumベース
  if (/Chrome/.test(ua)) {
    return {
      name: "chrome",
      displayName: "Chrome",
      isIOS: false,
      isAndroid: false,
      isMobile: false,
    };
  }

  // その他のChromiumベース
  if (/Chromium/.test(ua)) {
    return {
      name: "chromium",
      displayName: "Chromium",
      isIOS: false,
      isAndroid: false,
      isMobile: false,
    };
  }

  // 不明
  return {
    name: "unknown",
    displayName: "不明なブラウザ",
    isIOS: false,
    isAndroid: false,
    isMobile: false,
  };
}

/**
 * Arc Browserかどうかをチェック（CSS変数による判別）
 * 注意: ページロード後でないと正確に判別できない
 */
function checkIsArc(): boolean {
  try {
    const arcPaletteTitle = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--arc-palette-title");

    // Arc固有のCSS変数が存在すればArc
    return arcPaletteTitle !== "";
  } catch {
    // エラーが発生した場合はArcではない
    return false;
  }
}

/**
 * ブラウザ名の日本語表示を取得
 */
export function getBrowserDisplayName(): string {
  return detectBrowser().displayName;
}

/**
 * モバイルデバイスかどうかを判定
 */
export function isMobileDevice(): boolean {
  return detectBrowser().isMobile;
}

/**
 * iOSデバイスかどうかを判定
 */
export function isIOSDevice(): boolean {
  return detectBrowser().isIOS;
}

/**
 * Androidデバイスかどうかを判定
 */
export function isAndroidDevice(): boolean {
  return detectBrowser().isAndroid;
}
