import {useState, useImperativeHandle, forwardRef} from "react";
import type {AudioAnalysisDiagnostics} from "./AudioReceiver";

export type LayoutMode =
  | "OnPerformance"
  | "BeginPerformance"
  | "NoSignal"
  | "Countdown";

export interface SignalLogEntry {
  timestamp: string;
  signal: string;
}

export interface NewHamburgerMenuProps {
  // Current State (読み取り専用)
  currentState: string;
  currentIndex: number;
  audioLevel?: number; // 音声入力レベル (0-1)
  audioDiagnostics?: AudioAnalysisDiagnostics | null; // 音声解析の診断情報

  // Signal Simulator - 実際の処理を実行するコールバック
  onBeginSignal: () => void;
  onFinishSignal: () => void;
  onEffectIndexChange: (index: number) => void;

  // Countdown Timer - startTime更新用のコールバック
  onStartTimeChange?: (startTime: number) => void;
}

export interface NewHamburgerMenuRef {
  addSignalLog: (entry: SignalLogEntry) => void;
}

export const NewHamburgerMenu = forwardRef<
  NewHamburgerMenuRef,
  NewHamburgerMenuProps
>(
  (
    {
      currentState,
      currentIndex,
      audioLevel = 0,
      audioDiagnostics = null,
      onBeginSignal,
      onFinishSignal,
      onEffectIndexChange,
      onStartTimeChange,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);

    // Signal Log の内部管理
    const [signalLog, setSignalLog] = useState<SignalLogEntry[]>([]);

    // Signal Simulator の内部管理
    const [currentSimulatorIndex, setCurrentSimulatorIndex] = useState(0);

    // Countdown Timer の内部管理
    const [countdownDate, setCountdownDate] = useState("2025-08-10");
    const [countdownTime, setCountdownTime] = useState("00:00");
    const [halfTime, setHalfTime] = useState(15);

    // 信号ログに追加（外部から呼び出し可能）
    const addSignalLog = (entry: SignalLogEntry) => {
      setSignalLog((prev) => [...prev, entry]);
    };

    // 外部から呼び出し可能な関数を公開
    useImperativeHandle(ref, () => ({
      addSignalLog,
    }));

    // BEGIN信号のハンドラー
    const handleBeginSignal = () => {
      if (currentState === "Countdown") return; // カウントダウン中は何もしない
      const timestamp = new Date().toLocaleTimeString();
      addSignalLog({timestamp, signal: "BEGIN"});
      onBeginSignal();
    };

    // FINISH信号のハンドラー
    const handleFinishSignal = () => {
      if (currentState === "Countdown") return; // カウントダウン中は何もしない
      const timestamp = new Date().toLocaleTimeString();
      addSignalLog({timestamp, signal: "FINISH"});
      onFinishSignal();
    };

    // セレクトボックスの変更ハンドラー
    const handleIndexChange = (newIndex: number) => {
      setCurrentSimulatorIndex(newIndex);
    };

    // Sendボタンのハンドラー
    const handleSendIndex = () => {
      if (currentState === "Countdown") return; // カウントダウン中は何もしない
      onEffectIndexChange(currentSimulatorIndex);
    };

    // カウントダウンタイマーの変更ハンドラー
    const handleDateChange = (date: string) => {
      setCountdownDate(date);
      if (onStartTimeChange) {
        const newStartTime = new Date(`${date}T${countdownTime}:00`).getTime();
        onStartTimeChange(newStartTime);
      }
    };

    const handleTimeChange = (time: string) => {
      setCountdownTime(time);
      if (onStartTimeChange) {
        const newStartTime = new Date(`${countdownDate}T${time}:00`).getTime();
        onStartTimeChange(newStartTime);
      }
    };

    const handleHalfTimeChange = (halfTime: number) => {
      setHalfTime(halfTime);
    };

    const toggleMenu = () => {
      setIsOpen(!isOpen);
    };

    const closeMenu = () => {
      setIsOpen(false);
    };

    return (
      <>
        {/* ハンバーガーメニューボタン */}
        <button
          onClick={toggleMenu}
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            width: "50px",
            height: "50px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            color: "white",
            fontSize: "24px",
            cursor: "pointer",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
          }}
        >
          ☰
        </button>

        {/* メニューオーバーレイ */}
        {isOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 999,
            }}
            onClick={closeMenu}
          />
        )}

        {/* メニューコンテンツ */}
        {isOpen && (
          <div
            style={{
              position: "fixed",
              top: "80px",
              right: "20px",
              width: "320px",
              height: "700px",
              overflowY: "auto",
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "12px",
              padding: "20px",
              zIndex: 1001,
              color: "white",
              backdropFilter: "blur(10px)",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "18px",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Control Panel
            </h3>

            {/* Current State Section */}
            <div style={{marginBottom: "25px"}}>
              <h4
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#007AFF",
                }}
              >
                Current State
              </h4>
              <div
                style={{
                  padding: "15px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <div style={{marginBottom: "8px"}}>{currentState}</div>
                <div style={{fontSize: "14px", opacity: 0.8}}>
                  index: {currentIndex}
                </div>
              </div>
            </div>

            {/* Audio Level Visualization */}
            <div style={{marginBottom: "25px"}}>
              <h4
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#007AFF",
                }}
              >
                Audio Input Level
              </h4>
              <div
                style={{
                  padding: "15px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                {/* Audio Level Bar */}
                <div
                  style={{
                    width: "100%",
                    height: "30px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    position: "relative",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(audioLevel * 100, 100)}%`,
                      height: "100%",
                      backgroundColor:
                        audioLevel > 0.7
                          ? "#28a745"
                          : audioLevel > 0.4
                          ? "#ffc107"
                          : "#007AFF",
                      transition: "width 0.1s ease, background-color 0.1s ease",
                      borderRadius: "4px",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "white",
                      textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    {Math.round(audioLevel * 100)}%
                  </div>
                </div>
                {/* Audio Level Text */}
                <div
                  style={{
                    fontSize: "12px",
                    opacity: 0.8,
                    textAlign: "center",
                  }}
                >
                  Level: {audioLevel.toFixed(3)}
                </div>
              </div>
            </div>

            {/* Received Signal Log Section */}
            <div style={{marginBottom: "25px"}}>
              <h4
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#007AFF",
                }}
              >
                Received Signal Log
              </h4>
              <div
                style={{
                  maxHeight: "150px",
                  overflowY: "auto",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                {signalLog.length === 0 ? (
                  <div style={{opacity: 0.6, fontSize: "14px"}}>
                    No signals received
                  </div>
                ) : (
                  signalLog.reverse().map((entry, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "8px",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        fontSize: "14px",
                      }}
                    >
                      <span style={{opacity: 0.7}}>{entry.timestamp}</span>
                      <span style={{marginLeft: "10px"}}>{entry.signal}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Signal Simulator Section */}
            <div style={{marginBottom: "25px"}}>
              <h4
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#007AFF",
                }}
              >
                Signal Simulator
              </h4>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                {/* BEGIN/FINISH Buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={handleBeginSignal}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#28a745",
                      border: "none",
                      borderRadius: "6px",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#218838";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#28a745";
                    }}
                  >
                    BEGIN
                  </button>
                  <button
                    onClick={handleFinishSignal}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#dc3545",
                      border: "none",
                      borderRadius: "6px",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#c82333";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#dc3545";
                    }}
                  >
                    FINISH
                  </button>
                </div>

                {/* Index Selector */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      minWidth: "60px",
                    }}
                  >
                    Index:
                  </label>
                  <select
                    value={currentSimulatorIndex}
                    onChange={(e) => handleIndexChange(Number(e.target.value))}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      borderRadius: "6px",
                      color: "white",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    {Array.from({length: 10}, (_, i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSendIndex}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#007AFF",
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Audio Analysis Diagnostics Section */}
            <div style={{marginBottom: "25px"}}>
              <h4
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#FF6B6B",
                }}
              >
                Audio Analysis Diagnostics
              </h4>
              <div
                style={{
                  padding: "15px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  fontSize: "12px",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                {audioDiagnostics ? (
                  <>
                    {/* AudioContext State */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>AudioContext State:</strong>{" "}
                      <span
                        style={{
                          color:
                            audioDiagnostics.audioContextState === "running"
                              ? "#28a745"
                              : audioDiagnostics.audioContextState ===
                                "suspended"
                              ? "#ffc107"
                              : "#dc3545",
                        }}
                      >
                        {audioDiagnostics.audioContextState || "N/A"}
                      </span>
                    </div>

                    {/* Sample Rate */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>Sample Rate:</strong>{" "}
                      {audioDiagnostics.sampleRate
                        ? `${audioDiagnostics.sampleRate} Hz ${
                            audioDiagnostics.sampleRate !== 44100
                              ? "(⚠️ Expected: 44100)"
                              : ""
                          }`
                        : "N/A"}
                    </div>

                    {/* FFT Size */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>FFT Size:</strong>{" "}
                      {audioDiagnostics.fftSize || "N/A"}
                    </div>

                    {/* Buffer Length */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>Buffer Length:</strong>{" "}
                      {audioDiagnostics.bufferLength || "N/A"}
                    </div>

                    {/* Frequency Resolution */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>Frequency Resolution:</strong>{" "}
                      {audioDiagnostics.frequencyResolution
                        ? `${audioDiagnostics.frequencyResolution.toFixed(
                            2
                          )} Hz/bin`
                        : "N/A"}
                    </div>

                    {/* Detection Loop Status */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>Detection Loop:</strong>{" "}
                      <span
                        style={{
                          color: audioDiagnostics.isDetectionLoopRunning
                            ? "#28a745"
                            : "#dc3545",
                        }}
                      >
                        {audioDiagnostics.isDetectionLoopRunning
                          ? "Running"
                          : "Stopped"}
                      </span>
                    </div>

                    {/* Filter Settings */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>Filter:</strong>{" "}
                      {audioDiagnostics.filterFrequency
                        ? `Freq: ${audioDiagnostics.filterFrequency.toFixed(
                            0
                          )}Hz, Gain: ${
                            audioDiagnostics.filterGain?.toFixed(1) || "N/A"
                          }dB`
                        : "N/A"}
                    </div>

                    {/* Detection Threshold */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>Detection Threshold:</strong>{" "}
                      {audioDiagnostics.detectionThreshold.toFixed(2)}
                    </div>

                    {/* Cooldown Status */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>Cooldown:</strong>{" "}
                      <span
                        style={{
                          color: audioDiagnostics.isCooldown
                            ? "#ffc107"
                            : "#28a745",
                        }}
                      >
                        {audioDiagnostics.isCooldown ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Last Detected Channel */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>Last Detected Channel:</strong>{" "}
                      {audioDiagnostics.detectedChannel !== null
                        ? `Channel ${
                            audioDiagnostics.detectedChannel
                          } (Intensity: ${audioDiagnostics.maxIntensity.toFixed(
                            3
                          )})`
                        : "None"}
                    </div>

                    {/* Last Signal Time */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>Last Signal Time:</strong>{" "}
                      {audioDiagnostics.lastSignalTime
                        ? `${Math.floor(
                            (Date.now() - audioDiagnostics.lastSignalTime) /
                              1000
                          )}s ago`
                        : "N/A"}
                    </div>

                    {/* Overall Max Intensity */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>Overall Max Intensity:</strong>{" "}
                      {audioDiagnostics.overallMaxIntensity.toFixed(3)}
                    </div>

                    {/* Channel Intensities with Frequency Info */}
                    <div style={{marginBottom: "10px"}}>
                      <strong>Channel Intensities & Frequencies:</strong>
                      <div
                        style={{
                          marginTop: "5px",
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: "5px",
                          fontSize: "10px",
                          maxHeight: "200px",
                          overflowY: "auto",
                        }}
                      >
                        {audioDiagnostics.channelInfos &&
                        audioDiagnostics.channelInfos.length > 0
                          ? audioDiagnostics.channelInfos.map((info) => {
                              const freqDiff = Math.abs(
                                info.targetFrequency - info.actualFrequency
                              );
                              const hasError = freqDiff > 5; // 5Hz以上の誤差がある場合

                              return (
                                <div
                                  key={info.channel}
                                  style={{
                                    padding: "6px",
                                    backgroundColor:
                                      info.intensity >=
                                      audioDiagnostics.detectionThreshold
                                        ? "rgba(40, 167, 69, 0.3)"
                                        : "rgba(255, 255, 255, 0.05)",
                                    borderRadius: "4px",
                                    border:
                                      info.intensity >=
                                      audioDiagnostics.detectionThreshold
                                        ? "1px solid #28a745"
                                        : hasError
                                        ? "1px solid #ffc107"
                                        : "1px solid rgba(255, 255, 255, 0.1)",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: "bold",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    Ch{info.channel}:{" "}
                                    {info.intensity.toFixed(3)}
                                  </div>
                                  <div style={{fontSize: "9px", opacity: 0.8}}>
                                    Target: {info.targetFrequency.toFixed(0)}Hz
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "9px",
                                      opacity: 0.8,
                                      color: hasError ? "#ffc107" : "inherit",
                                    }}
                                  >
                                    Actual: {info.actualFrequency.toFixed(0)}Hz
                                    {hasError && (
                                      <span style={{color: "#ffc107"}}>
                                        {" "}
                                        (⚠️ {freqDiff.toFixed(0)}Hz diff)
                                      </span>
                                    )}
                                  </div>
                                  <div style={{fontSize: "9px", opacity: 0.7}}>
                                    Bin: {info.binIndex}
                                  </div>
                                  <div
                                    style={{
                                      width: "100%",
                                      height: "4px",
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.1)",
                                      borderRadius: "2px",
                                      marginTop: "4px",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${Math.min(
                                          info.intensity * 100,
                                          100
                                        )}%`,
                                        height: "100%",
                                        backgroundColor:
                                          info.intensity >=
                                          audioDiagnostics.detectionThreshold
                                            ? "#28a745"
                                            : "#007AFF",
                                        transition: "width 0.1s ease",
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          : audioDiagnostics.channelIntensities.map(
                              (intensity, index) => (
                                <div
                                  key={index}
                                  style={{
                                    padding: "4px",
                                    backgroundColor:
                                      intensity >=
                                      audioDiagnostics.detectionThreshold
                                        ? "rgba(40, 167, 69, 0.3)"
                                        : "rgba(255, 255, 255, 0.05)",
                                    borderRadius: "4px",
                                    border:
                                      intensity >=
                                      audioDiagnostics.detectionThreshold
                                        ? "1px solid #28a745"
                                        : "1px solid rgba(255, 255, 255, 0.1)",
                                  }}
                                >
                                  <div>
                                    Ch{index}: {intensity.toFixed(3)}
                                  </div>
                                  <div
                                    style={{
                                      width: "100%",
                                      height: "4px",
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.1)",
                                      borderRadius: "2px",
                                      marginTop: "2px",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${Math.min(
                                          intensity * 100,
                                          100
                                        )}%`,
                                        height: "100%",
                                        backgroundColor:
                                          intensity >=
                                          audioDiagnostics.detectionThreshold
                                            ? "#28a745"
                                            : "#007AFF",
                                        transition: "width 0.1s ease",
                                      }}
                                    />
                                  </div>
                                </div>
                              )
                            )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{opacity: 0.6}}>No diagnostics available</div>
                )}
              </div>
            </div>

            {/* Countdown Timer Section */}
            <div style={{marginBottom: "20px"}}>
              <h4
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#007AFF",
                }}
              >
                Countdown Timer
              </h4>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      minWidth: "50px",
                    }}
                  >
                    Date:
                  </label>
                  <input
                    type="date"
                    value={countdownDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      borderRadius: "6px",
                      color: "white",
                      fontSize: "14px",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      minWidth: "50px",
                    }}
                  >
                    Time:
                  </label>
                  <input
                    type="time"
                    value={countdownTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      borderRadius: "6px",
                      color: "white",
                      fontSize: "14px",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      minWidth: "50px",
                    }}
                  >
                    Half Time (min):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={halfTime}
                    onChange={(e) =>
                      handleHalfTimeChange(Number(e.target.value))
                    }
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      borderRadius: "6px",
                      color: "white",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={closeMenu}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                color: "white",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.1)";
              }}
            >
              Close
            </button>
          </div>
        )}
      </>
    );
  }
);

NewHamburgerMenu.displayName = "NewHamburgerMenu";
