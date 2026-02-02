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
  ArrowLeft,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

// --- Types ---
interface StepState {
  // Data State
  stack: number[]; // Stores values (not indices, per the code provided)
  rawAns: number[]; // The ArrayList accumulating results
  finalAns: number[]; // The reversed array aligned with input

  // Iteration State
  phase: "init" | "loop" | "pop" | "record" | "push" | "reverse" | "complete";
  currentIndex: number;
  compareVal?: number; // Value from stack top we are comparing

  // Visuals
  activeIndices: number[];
  poppedVal?: number;
  highlightResultIdx?: number; // Which index in rawAns was just added

  // Meta
  explanation: string;
  codeLine: string;
}

// --- Constants ---
const MAX_ARR_SIZE = 12;
const MAX_VAL = 50;

export default function NextGreaterElementVisualizer() {
  // --- Inputs ---
  const [arr, setArr] = useState<number[]>([1, 3, 2, 4]);

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
    generateSteps();
  }, [arr]);

  const generateSteps = () => {
    const newSteps: StepState[] = [];
    const n = arr.length;
    const stack: number[] = [];
    const ansList: number[] = [];

    // 1. Init
    newSteps.push({
      stack: [],
      rawAns: [],
      finalAns: [],
      phase: "init",
      currentIndex: -1,
      activeIndices: [],
      explanation: "Initialize an empty Stack and an ArrayList 'ans'.",
      codeLine: "init",
    });

    // 2. Loop
    for (let i = n - 1; i >= 0; i--) {
      const currentVal = arr[i];

      newSteps.push({
        stack: [...stack],
        rawAns: [...ansList],
        finalAns: [],
        phase: "loop",
        currentIndex: i,
        activeIndices: [i],
        explanation: `Processing index ${i} (Value: ${currentVal}).`,
        codeLine: "loop",
      });

      // 3. While Loop (Pop)
      while (stack.length > 0) {
        const topVal = stack[stack.length - 1];

        newSteps.push({
          stack: [...stack],
          rawAns: [...ansList],
          finalAns: [],
          phase: "pop",
          currentIndex: i,
          compareVal: topVal,
          activeIndices: [i],
          explanation: `Check Stack Top (${topVal}). Is ${currentVal} >= ${topVal}?`,
          codeLine: "check-pop",
        });

        if (currentVal >= topVal) {
          stack.pop();
          newSteps.push({
            stack: [...stack],
            rawAns: [...ansList],
            finalAns: [],
            phase: "pop",
            currentIndex: i,
            poppedVal: topVal,
            activeIndices: [i],
            explanation: `Yes, ${currentVal} >= ${topVal}. Pop ${topVal} because it cannot be the "Next Greater" for ${currentVal} or anyone to the left.`,
            codeLine: "do-pop",
          });
        } else {
          newSteps.push({
            stack: [...stack],
            rawAns: [...ansList],
            finalAns: [],
            phase: "pop",
            currentIndex: i,
            compareVal: topVal,
            activeIndices: [i],
            explanation: `No, ${currentVal} < ${topVal}. Stop popping. ${topVal} is the next greater element.`,
            codeLine: "check-pop",
          });
          break;
        }
      }

      // 4. Record Answer
      let recordedVal;
      if (stack.length > 0) {
        recordedVal = stack[stack.length - 1];
        ansList.add ? ansList.add(recordedVal) : ansList.push(recordedVal);

        newSteps.push({
          stack: [...stack],
          rawAns: [...ansList],
          finalAns: [],
          phase: "record",
          currentIndex: i,
          highlightResultIdx: ansList.length - 1,
          activeIndices: [i],
          explanation: `Stack is not empty. Next greater is stack top (${recordedVal}). Add to 'ans'.`,
          codeLine: "add-peek",
        });
      } else {
        recordedVal = -1;
        ansList.add ? ansList.add(recordedVal) : ansList.push(recordedVal);

        newSteps.push({
          stack: [...stack],
          rawAns: [...ansList],
          finalAns: [],
          phase: "record",
          currentIndex: i,
          highlightResultIdx: ansList.length - 1,
          activeIndices: [i],
          explanation: `Stack is empty. No greater element to the right. Add -1 to 'ans'.`,
          codeLine: "add-neg1",
        });
      }

      // 5. Push
      stack.push(currentVal);
      newSteps.push({
        stack: [...stack],
        rawAns: [...ansList],
        finalAns: [],
        phase: "push",
        currentIndex: i,
        activeIndices: [i],
        explanation: `Push current value ${currentVal} onto the stack.`,
        codeLine: "push",
      });
    }

    // 6. Reverse
    newSteps.push({
      stack: [...stack],
      rawAns: [...ansList],
      finalAns: [],
      phase: "reverse",
      currentIndex: -1,
      activeIndices: [],
      explanation:
        "Loop complete. The 'ans' list was built backwards (for n-1 down to 0). Now reverse it.",
      codeLine: "reverse",
    });

    const final = [...ansList].reverse();
    newSteps.push({
      stack: [...stack],
      rawAns: [...ansList],
      finalAns: final,
      phase: "complete",
      currentIndex: -1,
      activeIndices: [],
      explanation: `Reversed 'ans' matches the input array order. Final Result: [${final.join(", ")}]`,
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

  const handleArrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^[\d, -]*$/.test(val)) {
      const parts = val
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(Number);
      if (
        parts.length <= MAX_ARR_SIZE &&
        parts.every((n) => Math.abs(n) <= MAX_VAL)
      ) {
        setArr(parts);
      }
    }
  };

  // --- Render Helpers ---
  const currentStep = steps[currentStepIndex];

  // Loading guard
  if (!currentStep)
    return (
      <div className="p-8 text-center text-slate-500">Initializing...</div>
    );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Layers className="text-indigo-600" size={20} />
          <h1 className="font-bold text-lg">
            Next Greater Element{" "}
            <span className="text-slate-400 font-normal text-sm ml-2">
              Monotonic Stack
            </span>
          </h1>
        </div>
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}
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
                Input Array
              </label>
              <input
                type="text"
                value={arr.join(", ")}
                onChange={handleArrChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                placeholder="1, 3, 2, 4"
              />
              <p className="text-xs text-slate-400 mt-1">
                Values |x| ≤ {MAX_VAL}.
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
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-3 text-xs text-indigo-800">
              <p className="font-semibold mb-1 flex items-center gap-1">
                <Info size={12} /> Strategy
              </p>
              Iterate backwards. Use a stack to keep track of potential "next
              greater" candidates.
              <br />
              <br />
              Since we need the <strong>first</strong> greater element to the
              right, we pop smaller elements because they are "blocked" by the
              current element.
            </div>
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex flex-col xl:flex-row gap-6 h-full">
              {/* Visualizer Container */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[500px] overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                    Visualization
                  </h2>
                  <div className="flex items-center gap-3 text-sm font-mono">
                    <span
                      className={`px-2 py-1 rounded border ${currentStep.phase === "loop" ? "bg-blue-100 border-blue-200 text-blue-700 font-bold" : "text-slate-400 border-transparent"}`}
                    >
                      Scan
                    </span>
                    <span
                      className={`px-2 py-1 rounded border ${currentStep.phase === "pop" ? "bg-amber-100 border-amber-200 text-amber-700 font-bold" : "text-slate-400 border-transparent"}`}
                    >
                      Pop
                    </span>
                    <span
                      className={`px-2 py-1 rounded border ${currentStep.phase === "record" ? "bg-purple-100 border-purple-200 text-purple-700 font-bold" : "text-slate-400 border-transparent"}`}
                    >
                      Record
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-8 flex flex-col relative overflow-auto">
                  <div className="flex flex-1 gap-8 items-center justify-center">
                    {/* Stack Visualization */}
                    <div className="w-24 flex flex-col items-center justify-end h-64 border-r border-slate-200 pr-8 mr-4 self-center transition-all">
                      <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                        Stack
                      </div>
                      <div className="flex flex-col-reverse gap-1 w-full flex-1 justify-start">
                        {currentStep.stack.map((val, stackPos) => (
                          <div
                            key={stackPos}
                            className={`
                                            h-10 w-full flex items-center justify-center px-2 rounded border font-mono text-sm transition-all duration-300 font-bold
                                            ${val === currentStep.compareVal ? "bg-amber-100 border-amber-400 text-amber-800 scale-105 shadow-md z-10" : "bg-slate-100 border-slate-300 text-slate-600"}
                                        `}
                          >
                            {val}
                          </div>
                        ))}
                        {currentStep.stack.length === 0 && (
                          <div className="text-xs text-slate-300 text-center italic py-4 border-2 border-dashed border-slate-100 rounded">
                            Empty
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400 text-center">
                        Stores values
                      </div>
                    </div>

                    {/* Main Array & Result Visualization */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-12">
                      {/* Input Array */}
                      <div className="flex items-end justify-center gap-2 h-24 relative">
                        {arr.map((val, idx) => {
                          const isCurrent = idx === currentStep.currentIndex;
                          const isStackTop =
                            currentStep.stack.length > 0 &&
                            currentStep.stack[currentStep.stack.length - 1] ===
                              val &&
                            currentStep.phase !== "push";
                          // Note: Values in stack aren't indices, so simple equality check for visual might be ambiguous if duplicates exist, but sufficient for basic demo.
                          // For perfect accuracy we'd need to store indices in stack, but the provided code stores values.

                          let bgClass =
                            "bg-slate-50 border-slate-200 text-slate-400";

                          if (isCurrent) {
                            bgClass =
                              "bg-blue-500 border-blue-600 text-white shadow-lg scale-110";
                          }

                          return (
                            <div
                              key={idx}
                              className="flex flex-col items-center gap-2"
                            >
                              <div
                                className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 text-lg font-bold transition-all duration-300 ${bgClass}`}
                              >
                                {val}
                              </div>
                              <span className="text-xs font-mono text-slate-400">
                                {idx}
                              </span>
                              {isCurrent && (
                                <div className="absolute -bottom-6 text-blue-500 font-bold text-xs animate-bounce">
                                  i
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Building Answer List */}
                      <div className="w-full flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                            Ans ArrayList
                          </span>
                          {currentStep.phase === "reverse" && (
                            <RefreshCw
                              className="animate-spin text-purple-500"
                              size={14}
                            />
                          )}
                        </div>
                        <div className="flex gap-2 min-h-[50px] p-2 bg-slate-50 rounded-xl border border-slate-200 items-center justify-start overflow-hidden max-w-full">
                          <span className="text-xs text-slate-400 font-mono italic mr-2">
                            start
                          </span>
                          {currentStep.rawAns.map((val, idx) => (
                            <div
                              key={idx}
                              className={`
                                                w-10 h-10 flex flex-shrink-0 items-center justify-center rounded border font-mono font-bold text-sm transition-all duration-500
                                                ${idx === currentStep.highlightResultIdx ? "bg-purple-100 border-purple-400 text-purple-700 scale-110" : "bg-white border-slate-300 text-slate-600"}
                                            `}
                            >
                              {val}
                            </div>
                          ))}
                          {currentStep.rawAns.length === 0 && (
                            <span className="text-xs text-slate-300">
                              Empty
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          (Fills from left to right as we iterate backwards)
                        </div>
                      </div>

                      {/* Final Reversed Array */}
                      {currentStep.finalAns.length > 0 && (
                        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
                            Final Result (Reversed)
                          </div>
                          <div className="flex gap-2">
                            {currentStep.finalAns.map((val, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col items-center gap-1"
                              >
                                <div className="w-12 h-12 flex items-center justify-center rounded-lg border-2 border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-sm">
                                  {val}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  arr[{idx}]
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="border-t border-slate-100 bg-slate-50 p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {currentStep.phase === "loop" && (
                      <span className="text-sm text-blue-600 font-medium flex items-center gap-2">
                        <ArrowLeft size={16} /> Iterating Backwards
                      </span>
                    )}
                    {currentStep.phase === "pop" && (
                      <span className="text-sm text-amber-600 font-medium">
                        Removing smaller elements from stack...
                      </span>
                    )}
                    {currentStep.phase === "push" && (
                      <span className="text-sm text-slate-500">
                        Pushing current to stack
                      </span>
                    )}
                  </div>
                  {currentStep.poppedVal !== undefined && (
                    <div className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold border border-rose-200">
                      Last Popped: {currentStep.poppedVal}
                    </div>
                  )}
                </div>
              </div>

              {/* Code Panel */}
              <div className="w-full xl:w-96 bg-slate-900 rounded-xl shadow-sm overflow-hidden flex flex-col shrink-0">
                <div className="p-3 bg-slate-800 border-b border-slate-700 text-slate-300 font-sans font-semibold text-xs">
                  Java Solution
                </div>
                <div className="p-4 text-slate-300 overflow-auto flex-1 font-mono text-xs leading-loose">
                  <pre>
                    {`public ArrayList<Integer> nextLargerElement(int[] arr) {
  Stack<Integer> st = new Stack<>();
  ArrayList<Integer> ans = new ArrayList<>();
  int n = arr.length;`}

                    <div
                      className={
                        currentStep.codeLine === "loop"
                          ? "bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500"
                          : ""
                      }
                    >
                      {`  for (int i = n - 1; i >= 0; i--) {`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "check-pop" ||
                        currentStep.codeLine === "do-pop"
                          ? "bg-amber-500/30 text-amber-200 -mx-4 px-4 border-l-2 border-amber-500"
                          : ""
                      }
                    >
                      {`    while (!st.isEmpty() && arr[i] >= st.peek()) {
      st.pop();
    }`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "add-peek"
                          ? "bg-purple-500/30 text-purple-200 -mx-4 px-4 border-l-2 border-purple-500"
                          : ""
                      }
                    >
                      {`    if (!st.isEmpty()) {
      ans.add(st.peek());
    }`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "add-neg1"
                          ? "bg-purple-500/30 text-purple-200 -mx-4 px-4 border-l-2 border-purple-500"
                          : ""
                      }
                    >
                      {`    else {
      ans.add(-1);
    }`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "push"
                          ? "bg-slate-600/50 text-white -mx-4 px-4 border-l-2 border-slate-400"
                          : ""
                      }
                    >
                      {`    st.push(arr[i]);
  }`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "reverse"
                          ? "bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500"
                          : ""
                      }
                    >
                      {`  Collections.reverse(ans);`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "return"
                          ? "bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500"
                          : ""
                      }
                    >
                      {`  return ans;
}`}
                    </div>
                  </pre>
                </div>

                {/* Explanation Box */}
                <div className="p-4 border-t border-slate-700 bg-slate-800 text-slate-300 text-sm">
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
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5"
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
