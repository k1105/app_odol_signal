import {useCallback, useEffect, useRef, useState} from "react";
import {AudioReceiver} from "./components/AudioReceiver";
import {InitialScreen} from "./components/InitialScreen";
// ハンバーガーメニュー関連をコメントアウト
// import {
//   NewHamburgerMenu,
//   type SignalLogEntry,
// } from "./components/NewHamburgerMenu";
// import type {LayoutMode} from "./components/NewHamburgerMenu";
type LayoutMode = "NoSignal" | "BeginPerformance" | "OnPerformance" | "Countdown";
import {OnPerformance} from "./components/layout/OnPerformance";
import {BeginPerformance} from "./components/layout/BeginPerformance";
import {NoSignal} from "./components/layout/NoSignal";
import {isMobileDevice} from "./utils/deviceDetection";
import {CameraStage} from "./components/layers/CameraStage";
import {Countdown} from "./components/layout/Countdown";
import {checkMediaPermissions} from "./utils/permissionChecker";

/* ---------- 定数 ---------- */
const NUM_EFFECTS = 9;

function FullCameraApp() {
  /* ---------- Refs & State ---------- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const initedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // ハンバーガーメニュー用ステート - コメントアウト
  // const [currentEffectSignal, setCurrentEffectSignal] = useState(-1); // effectSignal: 0-8（エフェクト切り替え）- 互換性のために保持
  const [currentPlayerSignal, setCurrentPlayerSignal] = useState<
    string | undefined
  >(undefined); // playerSignal: "BLUE" | "YELLOW" | "RED"（オーバーレイ切り替え）
  const [ready, setReady] = useState(false);
  const [isNoSignalDetected, setIsNoSignalDetected] = useState(true); // 初期状態では信号なし
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<{
    title: string;
    message: string;
    solution: string[];
    technicalDetails?: string;
  } | null>(null);
  const [layout, setLayout] = useState<LayoutMode>("NoSignal");

  // 各レイヤー用の独立したエフェクト信号
  const [overlayEffectSignal, setOverlayEffectSignal] = useState(-1); // 信号0-2用
  const [cameraEffectSignal, setCameraEffectSignal] = useState(-1); // 信号3-5用
  const [transientEffectSignal, setTransientEffectSignal] = useState(-1); // 信号6-8用
  const lastTransientSignalTimeRef = useRef<number | null>(null);

  // エフェクト制御
  const isBeginingSongRef = useRef(false);
  const beginFlagRef = useRef(false);
  const lastEffectIdRef = useRef<number>(-1); // 前回のエフェクトIDを追跡

  // ハンバーガーメニュー用ステート - コメントアウト
  // const [countdownDate, setCountdownDate] = useState("2025-08-10");
  // const [countdownTime, setCountdownTime] = useState("00:00");
  // const [halfTime, setHalfTime] = useState(15);
  // const [startTime, setStartTime] = useState(
  //   new Date(`${countdownDate}T${countdownTime}:00`).getTime()
  // );
  // const [ellapsedTime, setEllapsedTime] = useState(0);
  // const isHalfTimeEllapsed = ellapsedTime > 60;
  const [startTime] = useState(new Date("2025-08-10T00:00:00").getTime());

  // setInterval(() => {
  //   setEllapsedTime(Math.floor((Date.now() - startTime) / 1000 / 60));
  // }, 5000);

  // const [signalLog, setSignalLog] = useState<SignalLogEntry[]>([]);

  const onBeginSignal = () => {
    if (!beginFlagRef.current && layout !== "Countdown") {
      setLayout("BeginPerformance");
      isBeginingSongRef.current = true;
      beginFlagRef.current = true;
      setTimeout(() => {
        // カウントダウン中でない場合のみレイアウト変更
        setLayout((currentLayout) =>
          currentLayout === "Countdown" ? "Countdown" : "OnPerformance"
        );
        isBeginingSongRef.current = false;
      }, 7000);
    }
  };

  const onFinnishSignal = () => {
    if (layout !== "Countdown") {
      setLayout("NoSignal");
    }
  };

  const onNoSignal = useCallback(() => {
    if (layout !== "Countdown") {
      setLayout("NoSignal");
      // ハンバーガーメニュー用 - コメントアウト
      // setCurrentEffectSignal(-1);
    }
  }, [layout]);

  const handleEffectDetected = (effectId: number) => {
    setIsNoSignalDetected(false);
    if (isBeginingSongRef.current) return;
    if (layout === "Countdown") return; // カウントダウン中は何もしない

    // 信号受信のたびに、前回のtransient信号から500ms以上経過しているかチェック
    const now = Date.now();
    if (lastTransientSignalTimeRef.current !== null) {
      if (now - lastTransientSignalTimeRef.current > 1000) {
        // 500ms以上経過していたら、transientエフェクトを停止
        setTransientEffectSignal(-1);
        lastTransientSignalTimeRef.current = null;
      }
    }

    // 信号9-11はplayerSignal（オーバーレイ切り替え）
    // 数値を文字列にマッピング: 9="BLUE", 10="YELLOW", 11="RED"
    if (effectId >= 9 && effectId <= 11) {
      const playerSignalMap: {[key: number]: string} = {
        9: "BLUE",
        10: "YELLOW",
        11: "RED",
      };
      setCurrentPlayerSignal(playerSignalMap[effectId]);
      return;
    }

    if (effectId === 14) {
      onBeginSignal();
      return;
    }
    if (effectId === 15) {
      onFinnishSignal();
      return;
    }

    // 信号0-8を3つのグループに区分して各レイヤーのエフェクトを制御
    // 信号0-2: OverlayPassCanvas用エフェクト
    if (effectId >= 0 && effectId <= 2) {
      if (effectId === 2) {
        // 信号2はニュートラル状態に戻す
        setOverlayEffectSignal(-1);
      } else {
        // 信号0, 1はそのままエフェクトIDを設定
        setOverlayEffectSignal(effectId);
      }
    }
    // 信号3-5: CameraPassCanvas用エフェクト
    else if (effectId >= 3 && effectId <= 5) {
      if (effectId === 5) {
        // 信号5はニュートラル状態に戻す
        setCameraEffectSignal(-1);
      } else {
        // 信号3, 4はそのままエフェクトIDを設定
        setCameraEffectSignal(effectId);
      }
    }
    // 信号6-8: TransientEffectsCanvas用エフェクト
    else if (effectId >= 6 && effectId <= 8) {
      // エフェクトIDを設定
      setTransientEffectSignal(effectId);

      // 最後に信号を受信した時刻を記録
      lastTransientSignalTimeRef.current = now;
    }

    // ハンバーガーメニュー用 - コメントアウト
    // if (isHalfTimeEllapsed) {
    //   beginFlagRef.current =
    //     currentEffectSignal !== effectId + 10 ? false : true;
    //   setCurrentEffectSignal(effectId + 10);
    //   setLayout("OnPerformance");
    //   return;
    // }
    // beginFlagRef.current = currentEffectSignal !== effectId ? false : true;
    // setCurrentEffectSignal(effectId);

    // 前回と異なるエフェクトIDが来た時、beginFlagをリセット
    beginFlagRef.current = lastEffectIdRef.current !== effectId ? false : true;
    lastEffectIdRef.current = effectId;

    setLayout("OnPerformance");
  };

  const handleNoSignalDetected = () => {
    if (isBeginingSongRef.current) return;
    setIsNoSignalDetected(true);
  };

  // ハンバーガーメニュー関連関数 - コメントアウト
  // const handleEffectChange = (effect: number) => {
  //   if (layout === "Countdown") return; // カウントダウン中は何もしない
  //   setCurrentEffectSignal(effect);
  // };

  // // 新しいハンバーガーメニュー用の関数
  // const handleBeginSignal = () => {
  //   if (layout === "Countdown") return; // カウントダウン中は何もしない
  //   const timestamp = new Date().toLocaleTimeString();
  //   setSignalLog((prev) => [...prev, {timestamp, signal: "BEGIN"}]);
  //   onBeginSignal();
  // };

  // const handleFinishSignal = () => {
  //   if (layout === "Countdown") return; // カウントダウン中は何もしない
  //   const timestamp = new Date().toLocaleTimeString();
  //   setSignalLog((prev) => [...prev, {timestamp, signal: "FINISH"}]);
  //   onFinnishSignal();
  // };

  // const handleSimulatorIndexChange = (index: number) => {
  //   if (layout === "Countdown") return; // カウントダウン中は何もしない
  //   beginFlagRef.current = currentEffectSignal !== index ? false : true;
  //   setCurrentEffectSignal(index);
  // };

  // 権限要求関数
  const requestPermissions = async () => {
    try {
      console.log("権限要求開始");
      setPermissionError(null); // エラーをクリア

      const width = isMobileDevice() ? 1920 : 1080;
      const height = isMobileDevice() ? 1080 : 1920;

      // 理想的な制約
      const constraints = {
        video: {
          facingMode: "environment",
          width: {ideal: width},
          height: {ideal: height},
          frameRate: {ideal: 30},
        },
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };

      console.log("使用する制約:", constraints);

      // 権限チェック（詳細なエラー解析付き）
      const result = await checkMediaPermissions(constraints);

      if (result.granted) {
        // 成功：ストリームを取得して保存
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        audioStreamRef.current = stream;

        console.log("権限が許可されました");
        setPermissionsGranted(true);
        setShowPermissionPrompt(false);

        // カメラ初期化
        await initializeCamera();
      } else {
        // 失敗：エラー情報を表示
        console.error("権限エラー:", result.error);
        if (result.error) {
          setPermissionError({
            title: result.error.title,
            message: result.error.message,
            solution: result.error.solution,
            technicalDetails: result.error.technicalDetails,
          });
        }

        // 基本制約で再試行（システムエラー以外の場合）
        if (result.error?.type !== "system") {
          console.log("基本制約で再試行");
          try {
            const basicResult = await checkMediaPermissions({
              video: true,
              audio: true,
            });

            if (basicResult.granted) {
              const basicStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
              });
              audioStreamRef.current = basicStream;

              console.log("基本制約での権限取得に成功");
              setPermissionsGranted(true);
              setShowPermissionPrompt(false);
              setPermissionError(null);
              await initializeCamera();
            }
          } catch (retryError) {
            console.error("再試行も失敗:", retryError);
          }
        }
      }
    } catch (error) {
      console.error("予期しないエラー:", error);
      setPermissionError({
        title: "予期しないエラー",
        message: "権限の取得中に問題が発生しました。",
        solution: ["ページを再読み込みしてください"],
        technicalDetails: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // カメラ初期化関数
  const initializeCamera = async () => {
    try {
      /* -- a) カメラ -- */
      const width = isMobileDevice() ? 1920 : 1080;
      const height = isMobileDevice() ? 1080 : 1920;

      const cameraConstraints = {
        video: {
          facingMode: "environment",
          width: {ideal: width},
          height: {ideal: height},
          frameRate: {ideal: 30},
        },
      };

      console.log("カメラ初期化用制約:", cameraConstraints);

      const stream = await navigator.mediaDevices.getUserMedia(
        cameraConstraints
      );
      streamRef.current = stream;
      const vid = videoRef.current!;
      vid.srcObject = stream;

      // metadata が来てから play
      await new Promise<void>((res) => {
        vid.onloadedmetadata = () => res();
      });
      await vid.play();

      setReady(true);
    } catch (error) {
      console.error("カメラ初期化に失敗しました:", error);
    }
  };

  /* ---------- 1) カメラ & エフェクト初期化（初回のみ） ---------- */
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    // 全てのブラウザで権限プロンプトを表示
    console.log("権限プロンプトを表示");
    setShowPermissionPrompt(true);

    /* -- クリーンアップ -- */
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // signal
  useEffect(() => {
    if (isNoSignalDetected && !isBeginingSongRef) {
      onNoSignal();
    }
  }, [isNoSignalDetected, onNoSignal]);

  // ハンバーガーメニュー関連useEffect - コメントアウト
  // // time
  // useEffect(() => {
  //   setStartTime(new Date(`${countdownDate}T${countdownTime}:00`).getTime());
  // }, [countdownDate, countdownTime]);

  // カウントダウン完了チェック（1秒ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() >= startTime && layout === "Countdown") {
        setLayout("NoSignal");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, layout]);

  // カウントダウン開始時の処理
  useEffect(() => {
    if (Date.now() < startTime) {
      setLayout("Countdown");
    }
  }, [startTime]);

  useEffect(() => {
    console.log(layout);
  }, [layout]);

  /* ---------- UI ---------- */
  return (
    <>
      <video
        ref={videoRef}
        style={{display: "none"}}
        playsInline
        muted
        autoPlay
      />

      {/* 権限要求プロンプト */}
      {showPermissionPrompt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              borderRadius: "10px",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <h2 style={{marginBottom: "20px", color: "#333"}}>
              カメラとマイクの許可が必要です
            </h2>
            <p style={{marginBottom: "30px", color: "#666", lineHeight: "1.5"}}>
              このアプリケーションではカメラとマイクを使用します。
              <br />
              それぞれ許可してください。
            </p>
            <button
              onClick={requestPermissions}
              style={{
                padding: "12px 24px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              許可する
            </button>
          </div>
        </div>
      )}

      <>
        <AudioReceiver
          onEffectDetected={handleEffectDetected}
          availableEffects={NUM_EFFECTS}
          onNoSignalDetected={handleNoSignalDetected}
          permissionsGranted={permissionsGranted}
          audioStream={audioStreamRef.current}
        />

        {/* 初期画面 - 信号同期モードで信号が検出されていない時のみ表示 */}

        {layout === "Countdown" ? (
          <Countdown startTime={startTime} />
        ) : (
          <>
            <CameraStage
              videoRef={videoRef}
              currentPlayerSignal={currentPlayerSignal}
              ready={ready}
              isNoSignalDetected={isNoSignalDetected}
              // onEffectChange={handleEffectChange} // ハンバーガーメニュー関連 - コメントアウト
              overlayEffectSignal={overlayEffectSignal}
              cameraEffectSignal={cameraEffectSignal}
              transientEffectSignal={transientEffectSignal}
            />

            {layout === "OnPerformance" && (
              <OnPerformance currentPlayerSignal={currentPlayerSignal} />
            )}

            {layout === "BeginPerformance" && (
              <BeginPerformance
                // currentEffectSignal={currentEffectSignal} // ハンバーガーメニュー関連 - コメントアウト
                currentPlayerSignal={currentPlayerSignal}
              />
            )}

            {layout === "NoSignal" && (
              <NoSignal currentPlayerSignal={currentPlayerSignal} />
            )}
          </>
        )}

        {!permissionsGranted && (
          <InitialScreen
            isVisible={isNoSignalDetected}
            onRequestPermissions={requestPermissions}
            showPermissionRequest={!permissionsGranted}
            errorMessage={permissionError?.message || null}
            errorTitle={permissionError?.title || null}
            errorSolution={permissionError?.solution || null}
            debugInfo={permissionError?.technicalDetails || null}
          />
        )}

        {/* ハンバーガーメニュー - コメントアウト */}
        {/* <NewHamburgerMenu
          currentState={layout}
          currentIndex={currentEffectSignal}
          signalLog={signalLog}
          onBeginSignal={handleBeginSignal}
          onFinishSignal={handleFinishSignal}
          onIndexChange={handleSimulatorIndexChange}
          currentSimulatorIndex={currentEffectSignal}
          countdownDate={countdownDate}
          countdownTime={countdownTime}
          halfTime={halfTime}
          onDateChange={setCountdownDate}
          onTimeChange={setCountdownTime}
          onHalfTimeChange={setHalfTime}
        /> */}
      </>
    </>
  );
}

export default function App() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <FullCameraApp />
    </div>
  );
}
