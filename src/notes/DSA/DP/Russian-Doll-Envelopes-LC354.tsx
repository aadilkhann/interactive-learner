import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  StepForward,
  StepBack,
  RotateCcw,
  Settings,
  Info,
  Layers,
  ArrowRight,
  Maximize,
  Check,
  X,
} from "lucide-react";

// --- Types ---
interface Envelope {
  w: number;
  h: number;
  id: number; // Original index for tracking
}

interface StepState {
  // Data State
  envelopes: Envelope[];
  dp: number[];

  // Iteration State
  phase: "sort" | "outer_loop" | "compare" | "update" | "complete";
  i: number; // Index of the outer envelope (container candidate)
  j: number; // Index of the inner envelope (content candidate)

  // Visuals
  fits: boolean | null; // Result of the check
  maxValSoFar?: number; // Tracking max for dp[i] during inner loop

  // Meta
  explanation: string;
  codeLine: string;
}

// --- Constants ---
const MAX_ENV_COUNT = 10;
const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 200;

export default function RussianDollVisualizer() {
  // --- Inputs ---
  // Using string input to allow easy user editing
  const [inputStr, setInputStr] = useState("[5,4],[6,4],[6,7],[2,3]");

  // --- UI State ---
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Simulation State ---
  const [steps, setSteps] = useState<StepState[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Logic Generation ---
  useEffect(() => {
    parseAndGenerate();
  }, [inputStr]);

  const parseAndGenerate = () => {
    try {
      // Basic parsing of string like "[5,4],[6,4]..."
      // Remove whitespace, then match pairs
      const cleanStr = inputStr.replace(/\s/g, "");
      const pairs: number[][] = [];
      const regex = /\[(\d+),(\d+)\]/g;
      let match;
      while ((match = regex.exec(cleanStr)) !== null) {
        pairs.push([parseInt(match[1]), parseInt(match[2])]);
      }

      if (pairs.length === 0) return;

      const envelopes: Envelope[] = pairs.map((p, idx) => ({
        w: p[0],
        h: p[1],
        id: idx,
      }));
      generateSteps(envelopes);
    } catch (e) {
      console.error("Invalid input format");
    }
  };

  const generateSteps = (initialEnvelopes: Envelope[]) => {
    const newSteps: StepState[] = [];
    const n = initialEnvelopes.length;

    // Copy for sorting
    let envs = [...initialEnvelopes];
    let dp = new Array(n).fill(1);

    // Step 0: Initial State
    newSteps.push({
      envelopes: [...envs],
      dp: [...dp],
      phase: "sort",
      i: -1,
      j: -1,
      fits: null,
      explanation: "Start with given envelopes. First, we must sort them.",
      codeLine: "init",
    });

    // Sort Logic: Width ASC, then Height ASC
    envs.sort((a, b) => {
      if (a.w !== b.w) return a.w - b.w;
      return a.h - b.h;
    });

    // Step 1: Sorted
    newSteps.push({
      envelopes: [...envs],
      dp: [...dp],
      phase: "sort",
      i: -1,
      j: -1,
      fits: null,
      explanation:
        "Sorted by Width (ascending), then Height (ascending). This simplifies finding smaller envelopes.",
      codeLine: "sort",
    });

    // DP Loop
    for (let i = 0; i < n; i++) {
      newSteps.push({
        envelopes: [...envs],
        dp: [...dp],
        phase: "outer_loop",
        i: i,
        j: -1,
        fits: null,
        explanation: `Processing Envelope ${i} ([${envs[i].w}, ${envs[i].h}]). Base chain length is 1 (itself).`,
        codeLine: "loop-i",
      });

      for (let j = 0; j < i; j++) {
        // Compare Visual
        const fits = envs[j].w < envs[i].w && envs[j].h < envs[i].h;

        newSteps.push({
          envelopes: [...envs],
          dp: [...dp],
          phase: "compare",
          i: i,
          j: j,
          fits: fits,
          explanation: `Checking if Env ${j} ([${envs[j].w}, ${envs[j].h}]) fits into Env ${i} ([${envs[i].w}, ${envs[i].h}]).`,
          codeLine: "check-fit",
        });

        if (fits) {
          const newLen = dp[j] + 1;
          const isImprovement = newLen > dp[i];

          if (isImprovement) {
            dp[i] = newLen;
            newSteps.push({
              envelopes: [...envs],
              dp: [...dp],
              phase: "update",
              i: i,
              j: j,
              fits: true,
              explanation: `It fits! We can extend the chain from Env ${j}. New max length for Env ${i} is dp[${j}] + 1 = ${newLen}.`,
              codeLine: "update-dp",
            });
          } else {
            newSteps.push({
              envelopes: [...envs],
              dp: [...dp],
              phase: "compare", // Staying on compare/no-op visually
              i: i,
              j: j,
              fits: true,
              explanation: `It fits, but using Env ${j} (len ${dp[j]}) doesn't improve current max length (${dp[i]}).`,
              codeLine: "update-dp", // Skipping actual update logic visually
            });
          }
        } else {
          newSteps.push({
            envelopes: [...envs],
            dp: [...dp],
            phase: "compare",
            i: i,
            j: j,
            fits: false,
            explanation: `It does NOT fit. Width or Height is not strictly smaller.`,
            codeLine: "check-fit",
          });
        }
      }
    }

    // Final result
    const maxLen = Math.max(...dp);
    newSteps.push({
      envelopes: [...envs],
      dp: [...dp],
      phase: "complete",
      i: -1,
      j: -1,
      fits: null,
      explanation: `DP Complete. The maximum number of envelopes is ${maxLen}.`,
      codeLine: "return",
    });

    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  // --- Controls ---
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1)
      setCurrentStepIndex((prev) => prev + 1);
    else setIsPlaying(false);
  };
  const handlePrev = () => {
    if (currentStepIndex > 0) setCurrentStepIndex((prev) => prev - 1);
  };
  const handleReset = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };
  const togglePlay = () => setIsPlaying(!isPlaying);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(handleNext, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, steps.length, playbackSpeed]);

  // --- Render Helpers ---
  const currentStep = steps[currentStepIndex];

  // Helper to scale envelope visuals
  const getMaxDim = (envs: Envelope[]) => {
    let max = 0;
    envs.forEach((e) => {
      max = Math.max(max, e.w, e.h);
    });
    return max || 1;
  };

  const renderEnvelope = (
    w: number,
    h: number,
    colorClass: string,
    label?: string,
    scale = 1,
  ) => {
    // We scale based on MAX_VAL usually, here dynamic based on set
    const maxDim = currentStep ? getMaxDim(currentStep.envelopes) : 10;
    const baseScale = 140 / maxDim; // 140px is max visual size

    const widthPx = w * baseScale;
    const heightPx = h * baseScale;

    return (
      <div
        className={`border-2 flex items-center justify-center relative transition-all duration-500 ${colorClass}`}
        style={{ width: widthPx, height: heightPx }}
      >
        <span className="text-[10px] font-bold bg-white/80 px-1 rounded backdrop-blur-sm pointer-events-none">
          {label || `[${w}, ${h}]`}
        </span>

        {/* Flap Visual (Cosmetic) */}
        <div
          className="absolute top-0 left-0 right-0 border-l-[1px] border-r-[1px] border-b-[1px] border-inherit opacity-30 pointer-events-none"
          style={{
            height: heightPx * 0.4,
            clipPath: "polygon(0 0, 50% 100%, 100% 0)",
          }}
        ></div>
      </div>
    );
  };

  if (!currentStep)
    return (
      <div className="p-8 text-center text-slate-500">Initializing...</div>
    );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Layers className="text-pink-600" size={20} />
          <h1 className="font-bold text-lg">
            Russian Doll Envelopes{" "}
            <span className="text-slate-400 font-normal text-sm ml-2">
              DP O(N²)
            </span>
          </h1>
        </div>
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? "bg-pink-50 text-pink-700" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <Settings size={16} />
          Config
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Configuration Panel */}
        <div
          className={`${isConfigOpen ? "w-80" : "w-0"} bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col shrink-0`}
        >
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Envelopes Input
              </label>
              <input
                type="text"
                value={inputStr}
                onChange={(e) => setInputStr(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-pink-500 font-mono text-sm"
                placeholder="[w,h], [w,h]..."
              />
              <p className="text-xs text-slate-400 mt-1">
                Format: <code>[w,h],[w,h]...</code>
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Animation Speed
              </label>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={2100 - playbackSpeed}
                onChange={(e) =>
                  setPlaybackSpeed(2100 - parseInt(e.target.value))
                }
                className="w-full accent-pink-600"
              />
            </div>

            <div className="bg-pink-50 border border-pink-100 rounded-md p-3 text-xs text-pink-800">
              <p className="font-semibold mb-1 flex items-center gap-1">
                <Info size={12} /> Logic
              </p>
              Sort envelopes by <strong>width ascending</strong>. If widths are
              equal, sort by <strong>height ascending</strong>.
              <br />
              <br />
              Then find the Longest Increasing Subsequence (LIS) based on
              height, ensuring width is also strictly increasing.
            </div>
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex flex-col xl:flex-row gap-6 h-full">
              {/* Main Visualizer Panel */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[500px] overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                    Visualization
                  </h2>
                  <div className="flex items-center gap-3 text-sm font-mono">
                    <span
                      className={`px-2 py-1 rounded border ${currentStep.phase === "sort" ? "bg-amber-100 border-amber-200 text-amber-700 font-bold" : "text-slate-400 border-transparent"}`}
                    >
                      Sort
                    </span>
                    <span
                      className={`px-2 py-1 rounded border ${currentStep.phase === "compare" ? "bg-blue-100 border-blue-200 text-blue-700 font-bold" : "text-slate-400 border-transparent"}`}
                    >
                      Compare
                    </span>
                    <span
                      className={`px-2 py-1 rounded border ${currentStep.phase === "update" ? "bg-emerald-100 border-emerald-200 text-emerald-700 font-bold" : "text-slate-400 border-transparent"}`}
                    >
                      Update DP
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-8 flex flex-col relative overflow-auto items-center">
                  {/* The Comparison Stage (Center Stage) */}
                  <div className="h-64 w-full flex items-center justify-center gap-16 mb-8 border-b border-slate-100 pb-8">
                    {currentStep.i !== -1 && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-xs font-bold text-slate-400 uppercase">
                          Outer (i)
                        </div>
                        {renderEnvelope(
                          currentStep.envelopes[currentStep.i].w,
                          currentStep.envelopes[currentStep.i].h,
                          "bg-pink-100 border-pink-500 text-pink-900",
                        )}
                      </div>
                    )}

                    {currentStep.phase === "compare" ||
                    currentStep.phase === "update" ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-2xl font-bold text-slate-300">
                          vs
                        </div>
                        {currentStep.fits === true && (
                          <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1 font-bold text-sm">
                            <Check size={16} /> Fits!
                          </div>
                        )}
                        {currentStep.fits === false && (
                          <div className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full flex items-center gap-1 font-bold text-sm">
                            <X size={16} /> No Fit
                          </div>
                        )}
                      </div>
                    ) : null}

                    {currentStep.j !== -1 && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-xs font-bold text-slate-400 uppercase">
                          Inner (j)
                        </div>
                        {renderEnvelope(
                          currentStep.envelopes[currentStep.j].w,
                          currentStep.envelopes[currentStep.j].h,
                          "bg-blue-100 border-blue-500 text-blue-900",
                        )}
                      </div>
                    )}
                  </div>

                  {/* Array of Envelopes & DP Table */}
                  <div className="flex gap-4 overflow-x-auto w-full pb-4 px-4 justify-center">
                    {currentStep.envelopes.map((env, idx) => {
                      const isI = idx === currentStep.i;
                      const isJ = idx === currentStep.j;
                      const dpVal = currentStep.dp[idx];

                      let borderClass = "border-slate-300";
                      let bgClass = "bg-white";

                      if (isI) {
                        borderClass = "border-pink-500 ring-2 ring-pink-200";
                        bgClass = "bg-pink-50";
                      } else if (isJ) {
                        borderClass = "border-blue-500 ring-2 ring-blue-200";
                        bgClass = "bg-blue-50";
                      }

                      return (
                        <div
                          key={env.id}
                          className="flex flex-col items-center gap-2 min-w-[60px]"
                        >
                          <div className="h-24 flex items-end justify-center">
                            {/* Represent Env scaled down */}
                            <div
                              className={`border transition-all duration-300 ${bgClass} ${borderClass}`}
                              style={{
                                width: Math.max(20, env.w * 4),
                                height: Math.max(20, env.h * 4),
                                maxWidth: 60,
                                maxHeight: 90,
                              }}
                            ></div>
                          </div>
                          <div className="text-xs font-mono font-bold text-slate-600">
                            [{env.w},{env.h}]
                          </div>

                          {/* DP Value Bubble */}
                          <div
                            className={`
                                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border transition-all duration-500
                                        ${isI && currentStep.phase === "update" ? "bg-emerald-500 text-white scale-110 border-emerald-600" : "bg-slate-100 text-slate-600 border-slate-200"}
                                    `}
                          >
                            {dpVal}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            dp[{idx}]
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Info */}
                <div className="border-t border-slate-100 bg-slate-50 p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {currentStep.phase === "sort" && (
                      <span className="text-sm text-amber-600 font-medium">
                        Sorting envelopes...
                      </span>
                    )}
                    {currentStep.phase === "outer_loop" && (
                      <span className="text-sm text-pink-600 font-medium">
                        Selected outer envelope (i)
                      </span>
                    )}
                    {currentStep.phase === "compare" && (
                      <span className="text-sm text-blue-600 font-medium">
                        Comparing with previous (j)...
                      </span>
                    )}
                  </div>
                  {currentStep.phase === "complete" && (
                    <div className="px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold border border-emerald-200">
                      Max Envelopes: {Math.max(...currentStep.dp)}
                    </div>
                  )}
                </div>
              </div>

              {/* Code Panel */}
              <div className="w-full xl:w-96 bg-slate-900 rounded-xl shadow-sm overflow-hidden flex flex-col shrink-0">
                <div className="p-3 bg-slate-800 border-b border-slate-700 text-slate-300 font-sans font-semibold text-xs">
                  Java Solution (O(N²))
                </div>
                <div className="p-4 text-slate-300 overflow-auto flex-1 font-mono text-xs leading-loose">
                  <pre>
                    {`public int maxEnvelopes(int[][] envelopes) {
  // Sort: width asc, height asc
  Arrays.sort(envelopes, (a, b) -> {`}
                    <div
                      className={
                        currentStep.codeLine === "sort"
                          ? "bg-amber-500/30 text-amber-200 -mx-4 px-4 border-l-2 border-amber-500"
                          : ""
                      }
                    >
                      {`    if (a[0] == b[0]) return a[1] - b[1];
    return a[0] - b[0];
  });`}
                    </div>

                    <div
                      className={
                        currentStep.codeLine === "init"
                          ? "bg-slate-700 text-white -mx-4 px-4"
                          : ""
                      }
                    >
                      {`  int n = envelopes.length;
  int[] dp = new int[n];
  Arrays.fill(dp, 1);`}
                    </div>

                    <div
                      className={
                        currentStep.codeLine === "loop-i"
                          ? "bg-pink-500/30 text-pink-200 -mx-4 px-4 border-l-2 border-pink-500"
                          : ""
                      }
                    >
                      {`  for (int i = 0; i < n; i++) {
    for (int j = 0; j < i; j++) {`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "check-fit"
                          ? "bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500"
                          : ""
                      }
                    >
                      {`      // Fits strictly inside?
      if (envelopes[j][0] < envelopes[i][0] && 
          envelopes[j][1] < envelopes[i][1]) {`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "update-dp"
                          ? "bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500"
                          : ""
                      }
                    >
                      {`        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "return"
                          ? "bg-slate-700 text-white -mx-4 px-4"
                          : ""
                      }
                    >
                      {`  int ans = 0;
  for (int x : dp) ans = Math.max(ans, x);
  return ans;
}`}
                    </div>
                  </pre>
                </div>

                {/* Explanation Box */}
                <div className="p-4 border-t border-slate-700 bg-slate-800 text-slate-300 text-sm h-32 overflow-y-auto">
                  {currentStep.explanation}
                </div>
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="h-20 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                  isPlaying
                    ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                    : "bg-pink-600 text-white hover:bg-pink-700 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                }`}
              >
                {isPlaying ? (
                  <Pause size={24} fill="currentColor" />
                ) : (
                  <Play size={24} fill="currentColor" className="ml-1" />
                )}
              </button>

              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={handlePrev}
                  disabled={currentStepIndex === 0}
                  className="p-2 hover:bg-white rounded-md disabled:opacity-30 transition-colors"
                >
                  <StepBack size={20} />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentStepIndex === steps.length - 1}
                  className="p-2 hover:bg-white rounded-md disabled:opacity-30 transition-colors"
                >
                  <StepForward size={20} />
                </button>
              </div>

              <button
                onClick={handleReset}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors ml-2"
              >
                <RotateCcw size={20} />
              </button>
            </div>

            <div className="flex flex-col items-end max-w-xl text-right">
              <div className="text-xs text-slate-400 mt-1">
                Step {currentStepIndex} of {steps.length - 1}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
