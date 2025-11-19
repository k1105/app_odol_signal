// 権限チェックユーティリティ

import {detectBrowser} from "./browserDetector";

export interface PermissionCheckResult {
  granted: boolean;
  error: {
    type: "system" | "browser" | "device" | "unknown";
    title: string;
    message: string;
    solution: string[];
    technicalDetails?: string;
  } | null;
}

/**
 * カメラとマイクのシステムレベル権限をチェック
 */
export async function checkMediaPermissions(
  constraints: MediaStreamConstraints
): Promise<PermissionCheckResult> {
  try {
    // デバイスの列挙
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasCamera = devices.some((d) => d.kind === "videoinput");
    const hasMicrophone = devices.some((d) => d.kind === "audioinput");

    console.log("検出されたデバイス:", {
      camera: hasCamera,
      microphone: hasMicrophone,
      devices: devices.map((d) => ({kind: d.kind, label: d.label})),
    });

    // getUserMedia()を試行
    const stream =
      await navigator.mediaDevices.getUserMedia(constraints);

    // 成功したらストリームを返す（呼び出し側で使用するため）
    return {granted: true, error: null};
  } catch (error) {
    // エラーの詳細を解析
    if (error instanceof Error) {
      return analyzePermissionError(error);
    }

    return {
      granted: false,
      error: {
        type: "unknown",
        title: "予期しないエラー",
        message: "メディアデバイスへのアクセスに失敗しました。",
        solution: [
          "ページを再読み込みしてください",
          "問題が続く場合は、ブラウザを再起動してください",
        ],
        technicalDetails: String(error),
      },
    };
  }
}

/**
 * getUserMediaのエラーを解析して、わかりやすいメッセージを生成
 */
function analyzePermissionError(error: Error): PermissionCheckResult {
  const errorName = error.name;
  const errorMessage = error.message.toLowerCase();

  // システムレベルの権限拒否（iOS設定など）
  if (
    errorName === "NotAllowedError" &&
    (errorMessage.includes("system") ||
      errorMessage.includes("denied by system") ||
      errorMessage.includes("not allowed by the user agent") ||
      errorMessage.includes("platform"))
  ) {
    return {
      granted: false,
      error: {
        type: "system",
        title: "システム設定で権限がブロックされています",
        message:
          "このブラウザにカメラとマイクの使用が許可されていません。",
        solution: getSystemPermissionSolution(),
        technicalDetails: `${error.name}: ${error.message}`,
      },
    };
  }

  // ブラウザレベルの権限拒否
  if (errorName === "NotAllowedError") {
    if (errorMessage.includes("dismissed")) {
      return {
        granted: false,
        error: {
          type: "browser",
          title: "権限のリクエストがキャンセルされました",
          message: "カメラとマイクの使用を許可してください。",
          solution: [
            "「許可する」ボタンをもう一度押してください",
            "ブラウザの権限ダイアログで「許可」を選択してください",
          ],
          technicalDetails: `${error.name}: ${error.message}`,
        },
      };
    }

    return {
      granted: false,
      error: {
        type: "browser",
        title: "カメラとマイクの使用が拒否されました",
        message:
          "ブラウザの設定でこのサイトへのアクセスが拒否されています。",
        solution: getBrowserPermissionSolution(),
        technicalDetails: `${error.name}: ${error.message}`,
      },
    };
  }

  // デバイスが見つからない
  if (errorName === "NotFoundError") {
    return {
      granted: false,
      error: {
        type: "device",
        title: "カメラまたはマイクが見つかりません",
        message: "デバイスにカメラとマイクが接続されていません。",
        solution: [
          "カメラとマイクが正しく接続されているか確認してください",
          "他のアプリがカメラを使用していないか確認してください",
          "デバイスを再起動してください",
        ],
        technicalDetails: `${error.name}: ${error.message}`,
      },
    };
  }

  // デバイスが使用中
  if (errorName === "NotReadableError") {
    return {
      granted: false,
      error: {
        type: "device",
        title: "カメラまたはマイクが使用中です",
        message: "他のアプリケーションがデバイスを使用している可能性があります。",
        solution: [
          "他のアプリ（Zoom、Teams、カメラアプリなど）を閉じてください",
          "ブラウザの他のタブでカメラを使用していないか確認してください",
          "ページを再読み込みしてください",
        ],
        technicalDetails: `${error.name}: ${error.message}`,
      },
    };
  }

  // その他のエラー
  return {
    granted: false,
    error: {
      type: "unknown",
      title: "メディアデバイスへのアクセスエラー",
      message: "カメラとマイクへのアクセスに失敗しました。",
      solution: [
        "ページを再読み込みしてください",
        "ブラウザを再起動してください",
        "問題が続く場合は、デバイスを再起動してください",
      ],
      technicalDetails: `${error.name}: ${error.message}`,
    },
  };
}

/**
 * システムレベル権限の解決方法（デバイス設定）
 */
function getSystemPermissionSolution(): string[] {
  const browser = detectBrowser();

  // iOS の場合
  if (browser.isIOS) {
    switch (browser.name) {
      case "chrome":
      case "arc":
        return [
          `【${browser.displayName}の場合】`,
          "1. iPhoneの「設定」アプリを開く",
          "2. 下にスクロールして「Chrome」を選択",
          "3. 「カメラ」と「マイク」をオンにする",
          "4. このページに戻って再度「許可する」ボタンを押す",
        ];

      case "safari":
        return [
          `【${browser.displayName}の場合】`,
          "1. iPhoneの「設定」アプリを開く",
          "2. 下にスクロールして「Safari」を選択",
          "3. 「カメラ」と「マイク」が「確認」または「許可」になっているか確認",
          "4. このページに戻って再度「許可する」ボタンを押す",
        ];

      case "firefox":
        return [
          `【${browser.displayName}の場合】`,
          "1. iPhoneの「設定」アプリを開く",
          "2. 下にスクロールして「Firefox」を選択",
          "3. 「カメラ」と「マイク」をオンにする",
          "4. このページに戻って再度「許可する」ボタンを押す",
        ];

      case "edge":
        return [
          `【${browser.displayName}の場合】`,
          "1. iPhoneの「設定」アプリを開く",
          "2. 下にスクロールして「Edge」を選択",
          "3. 「カメラ」と「マイク」をオンにする",
          "4. このページに戻って再度「許可する」ボタンを押す",
        ];

      default:
        return [
          `【${browser.displayName}の場合】`,
          "1. iPhoneの「設定」アプリを開く",
          "2. ブラウザアプリを探して選択",
          "3. 「カメラ」と「マイク」をオンにする",
          "4. このページに戻って再度「許可する」ボタンを押す",
        ];
    }
  }

  // Android の場合
  if (browser.isAndroid) {
    switch (browser.name) {
      case "chrome":
      case "arc":
        return [
          `【${browser.displayName}の場合】`,
          "1. Androidの「設定」アプリを開く",
          "2. 「アプリ」または「アプリと通知」を選択",
          "3. 「Chrome」を選択",
          "4. 「権限」→「カメラ」と「マイク」をオンにする",
          "5. このページに戻って再度「許可する」ボタンを押す",
        ];

      case "firefox":
        return [
          `【${browser.displayName}の場合】`,
          "1. Androidの「設定」アプリを開く",
          "2. 「アプリ」または「アプリと通知」を選択",
          "3. 「Firefox」を選択",
          "4. 「権限」→「カメラ」と「マイク」をオンにする",
          "5. このページに戻って再度「許可する」ボタンを押す",
        ];

      case "edge":
        return [
          `【${browser.displayName}の場合】`,
          "1. Androidの「設定」アプリを開く",
          "2. 「アプリ」または「アプリと通知」を選択",
          "3. 「Edge」を選択",
          "4. 「権限」→「カメラ」と「マイク」をオンにする",
          "5. このページに戻って再度「許可する」ボタンを押す",
        ];

      default:
        return [
          `【${browser.displayName}の場合】`,
          "1. Androidの「設定」アプリを開く",
          "2. 「アプリ」または「アプリと通知」を選択",
          "3. ブラウザアプリを選択",
          "4. 「権限」→「カメラ」と「マイク」をオンにする",
          "5. このページに戻って再度「許可する」ボタンを押す",
        ];
    }
  }

  // デスクトップ（macOS/Windows/Linux）の場合
  return [
    `【${browser.displayName}の場合】`,
    "デバイスの設定でブラウザにカメラとマイクの使用を許可してください",
    "設定後、このページに戻って再度「許可する」ボタンを押してください",
  ];
}

/**
 * ブラウザレベル権限の解決方法
 */
function getBrowserPermissionSolution(): string[] {
  const browser = detectBrowser();

  switch (browser.name) {
    case "chrome":
      if (browser.isMobile) {
        return [
          `【${browser.displayName}の場合】`,
          "1. アドレスバーの左側にある鍵アイコンまたはカメラアイコンをタップ",
          "2. 「カメラ」と「マイク」の権限を「許可」に変更",
          "3. ページを再読み込み",
        ];
      }
      return [
        `【${browser.displayName}の場合】`,
        "1. アドレスバーの左側にある鍵アイコンまたはカメラアイコンをクリック",
        "2. 「サイトの設定」を選択",
        "3. 「カメラ」と「マイク」を「許可」に変更",
        "4. ページを再読み込み",
      ];

    case "arc":
      return [
        `【${browser.displayName}の場合】`,
        "1. アドレスバーの左側にある鍵アイコンをクリック",
        "2. 「サイトの設定」を選択",
        "3. 「カメラ」と「マイク」を「許可」に変更",
        "4. ページを再読み込み",
        "",
        "※ Arcは基本的にChromeと同じ操作です",
      ];

    case "safari":
      if (browser.isIOS) {
        return [
          `【${browser.displayName}の場合】`,
          "1. アドレスバーの左側にある「AA」アイコンをタップ",
          "2. 「Webサイトの設定」をタップ",
          "3. 「カメラ」と「マイク」を「許可」に変更",
          "4. ページを再読み込み",
        ];
      }
      return [
        `【${browser.displayName}の場合】`,
        "1. アドレスバーの左側にある「ぁあ」アイコンをクリック",
        "2. 「このWebサイトの設定」を選択",
        "3. 「カメラ」と「マイク」を「許可」に変更",
        "4. ページを再読み込み",
      ];

    case "firefox":
      if (browser.isMobile) {
        return [
          `【${browser.displayName}の場合】`,
          "1. アドレスバーの左側にある鍵アイコンをタップ",
          "2. 「サイト情報を表示」をタップ",
          "3. 「権限」セクションで「カメラ」と「マイク」を確認",
          "4. ブロックされている場合は「許可」に変更",
          "5. ページを再読み込み",
        ];
      }
      return [
        `【${browser.displayName}の場合】`,
        "1. アドレスバーの左側にある鍵アイコンをクリック",
        "2. 「接続の詳細を表示」→「詳細を表示」をクリック",
        "3. 「権限」タブで「カメラ」と「マイク」の権限を確認",
        "4. ブロックされている場合は「許可」に変更",
        "5. ページを再読み込み",
      ];

    case "edge":
      if (browser.isMobile) {
        return [
          `【${browser.displayName}の場合】`,
          "1. アドレスバーの左側にある鍵アイコンをタップ",
          "2. 「権限」を選択",
          "3. 「カメラ」と「マイク」を「許可」に変更",
          "4. ページを再読み込み",
        ];
      }
      return [
        `【${browser.displayName}の場合】`,
        "1. アドレスバーの左側にある鍵アイコンをクリック",
        "2. 「このサイトの権限」を選択",
        "3. 「カメラ」と「マイク」を「許可」に変更",
        "4. ページを再読み込み",
      ];

    default:
      return [
        `【${browser.displayName}の場合】`,
        "1. ブラウザのアドレスバーから権限設定を確認してください",
        "2. カメラとマイクの権限を「許可」に変更してください",
        "3. ページを再読み込みしてください",
      ];
  }
}
