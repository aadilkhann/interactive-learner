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
  Repeat,
  ArrowLeft,
} from "lucide-react";

// --- Types ---
interface StepState {
  // Data State
  stack: number[];
  ans: number[];

  // Iteration State
  phase: "init" | "loop" | "pop" | "record" | "push" | "complete";
  i: number; // The virtual index (0 to 2n-1)
  modIndex: number; // The actual index (i % n)
  val: number; // arr[i % n]
  compareVal?: number;

  // Visuals
  activeIndices: number[];
  poppedVal?: number;

  // Meta
  explanation: string;
  codeLine: string;
}

// --- Constants ---
const MAX_ARR_SIZE = 8; // Smaller limit to fit 2*N on screen
const MAX_VAL = 50;

export default function NextGreaterElementIIVisualizer() {
  // --- Inputs ---
  const [arr, setArr] = useState<number[]>([1, 2, 1]);

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
    const ans = new Array(n).fill(-1);
    const stack: number[] = []; // Stores values

    // 1. Init
    newSteps.push({
      stack: [],
      ans: [...ans],
      phase: "init",
      i: -1,
      modIndex: -1,
      val: 0,
      activeIndices: [],
      explanation: "Initialize 'ans' array with -1s and an empty Stack.",
      codeLine: "init",
    });

    // 2. Loop
    for (let i = 2 * n - 1; i >= 0; i--) {
      const idx = i % n;
      const cur = arr[idx];

      newSteps.push({
        stack: [...stack],
        ans: [...ans],
        phase: "loop",
        i: i,
        modIndex: idx,
        val: cur,
        activeIndices: [i],
        explanation: `Processing index i=${i} (Mapped to arr[${idx}] = ${cur}).`,
        codeLine: "loop",
      });

      // 3. While Loop (Pop)
      while (stack.length > 0) {
        const top = stack[stack.length - 1];

        newSteps.push({
          stack: [...stack],
          ans: [...ans],
          phase: "pop",
          i: i,
          modIndex: idx,
          val: cur,
          compareVal: top,
          activeIndices: [i],
          explanation: `Check Stack Top (${top}). Is Stack Top <= Current (${cur})?`,
          codeLine: "check-pop",
        });

        if (top <= cur) {
          stack.pop();
          newSteps.push({
            stack: [...stack],
            ans: [...ans],
            phase: "pop",
            i: i,
            modIndex: idx,
            val: cur,
            poppedVal: top,
            activeIndices: [i],
            explanation: `Yes, ${top} <= ${cur}. Pop ${top} because it's not greater than current.`,
            codeLine: "do-pop",
          });
        } else {
          newSteps.push({
            stack: [...stack],
            ans: [...ans],
            phase: "pop",
            i: i,
            modIndex: idx,
            val: cur,
            compareVal: top,
            activeIndices: [i],
            explanation: `No, ${top} > ${cur}. Stop popping. We found the next greater element.`,
            codeLine: "check-pop",
          });
          break;
        }
      }

      // 4. Record Answer (Only for first pass i < n)
      if (i < n) {
        newSteps.push({
          stack: [...stack],
          ans: [...ans],
          phase: "record",
          i: i,
          modIndex: idx,
          val: cur,
          activeIndices: [i],
          explanation: `i < n (${i} < ${n}). We are in the actual array range. Record the answer.`,
          codeLine: "check-range",
        });

        const result = stack.length === 0 ? -1 : stack[stack.length - 1];
        ans[i] = result;

        newSteps.push({
          stack: [...stack],
          ans: [...ans],
          phase: "record",
          i: i,
          modIndex: idx,
          val: cur,
          activeIndices: [i],
          explanation:
            stack.length === 0
              ? `Stack is empty. No greater element found. Ans[${i}] = -1.`
              : `Stack Top is ${result}. Ans[${i}] = ${result}.`,
          codeLine: "record-ans",
        });
      } else {
        newSteps.push({
          stack: [...stack],
          ans: [...ans],
          phase: "record",
          i: i,
          modIndex: idx,
          val: cur,
          activeIndices: [i],
          explanation: `i >= n (${i} >= ${n}). This is the "virtual" second copy. We don't record answers here, just build the stack.`,
          codeLine: "check-range",
        });
      }

      // 5. Push
      stack.push(cur);
      newSteps.push({
        stack: [...stack],
        ans: [...ans],
        phase: "push",
        i: i,
        modIndex: idx,
        val: cur,
        activeIndices: [i],
        explanation: `Push current value ${cur} to stack.`,
        codeLine: "push",
      });
    }

    // Complete
    newSteps.push({
      stack: [...stack],
      ans: [...ans],
      phase: "complete",
      i: -1,
      modIndex: -1,
      val: 0,
      activeIndices: [],
      explanation: `Traversal complete. Final result array computed.`,
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

  if (!currentStep)
    return (
      <div className="p-8 text-center text-slate-500">Initializing...</div>
    );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Repeat className="text-purple-600" size={20} />
          <h1 className="font-bold text-lg">
            Next Greater Element II{" "}
            <span className="text-slate-400 font-normal text-sm ml-2">
              Circular Array
            </span>
          </h1>
        </div>
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? "bg-purple-50 text-purple-700" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <Settings size={16} />
          Config
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Config */}
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
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                placeholder="1, 2, 1"
              />
              <p className="text-xs text-slate-400 mt-1">
                Limit: {MAX_ARR_SIZE} elements.
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
                className="w-full accent-purple-600"
              />
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-md p-3 text-xs text-purple-800">
              <p className="font-semibold mb-1 flex items-center gap-1">
                <Info size={12} /> Circular Logic
              </p>
              To handle the circular property, we iterate up to{" "}
              <code>2 * n - 1</code>.
              <br />
              <br />
              The indices <code>n</code> to <code>2n-1</code> act as a virtual
              copy, helping elements at the end of the array "see" the
              beginning.
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
                      className={`px-2 py-1 rounded border ${currentStep.phase === "record" ? "bg-emerald-100 border-emerald-200 text-emerald-700 font-bold" : "text-slate-400 border-transparent"}`}
                    >
                      Record
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-8 flex flex-col relative overflow-auto">
                  <div className="flex flex-1 gap-12 items-center justify-center">
                    {/* Stack */}
                    <div className="w-24 flex flex-col items-center justify-end h-64 border-r border-slate-200 pr-8 self-center transition-all">
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

                    {/* Arrays */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-10">
                      {/* Extended Array Visualization */}
                      <div className="w-full flex flex-col items-center">
                        <div className="w-full text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-center gap-2">
                          <span>Actual Array (0 to n-1)</span>
                          <span className="text-slate-300">|</span>
                          <span className="opacity-50">
                            Virtual Copy (n to 2n-1)
                          </span>
                        </div>
                        <div className="flex items-end justify-center gap-2 h-24 relative flex-wrap">
                          {/* Render 2*N items */}
                          {[...arr, ...arr].map((val, idx) => {
                            const isVirtual = idx >= arr.length;
                            const isCurrent = idx === currentStep.i;

                            let bgClass = isVirtual
                              ? "bg-slate-50 border-slate-200 text-slate-400 border-dashed"
                              : "bg-white border-slate-300 text-slate-600";

                            if (isCurrent) {
                              bgClass =
                                "bg-blue-500 border-blue-600 text-white shadow-lg scale-110 z-10";
                            }

                            return (
                              <div
                                key={idx}
                                className={`flex flex-col items-center gap-2 ${isVirtual ? "opacity-70" : "opacity-100"}`}
                              >
                                <div
                                  className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 text-lg font-bold transition-all duration-300 ${bgClass}`}
                                >
                                  {val}
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
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

                          {/* Divider Line */}
                          <div className="absolute top-0 bottom-0 w-px bg-slate-300 left-1/2 -translate-x-1/2 border-l border-dashed border-slate-300 -z-10"></div>
                        </div>
                      </div>

                      {/* Result Array */}
                      <div className="w-full max-w-2xl bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col items-center">
                        <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">
                          Result Array (ans)
                        </div>
                        <div className="flex gap-2">
                          {currentStep.ans.map((val, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col items-center gap-1"
                            >
                              <div
                                className={`w-10 h-10 flex items-center justify-center rounded font-mono font-bold text-sm transition-all duration-500 border ${val !== -1 ? "bg-emerald-100 border-emerald-400 text-emerald-800" : "bg-white border-slate-200 text-slate-400"}`}
                              >
                                {val}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {idx}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
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
                        Removing smaller elements...
                      </span>
                    )}
                    {currentStep.phase === "record" && (
                      <span className="text-sm text-emerald-600 font-medium">
                        Recording answer
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
                    {`public int[] nextGreaterElements(int[] nums) {
  int n = nums.length;
  int[] ans = new int[n];
  Arrays.fill(ans, -1);
  Deque<Integer> st = new ArrayDeque<>();`}

                    <div
                      className={
                        currentStep.codeLine === "loop"
                          ? "bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500"
                          : ""
                      }
                    >
                      {`  for (int i = 2 * n - 1; i >= 0; i--) {
    int cur = nums[i % n];`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "check-pop" ||
                        currentStep.codeLine === "do-pop"
                          ? "bg-amber-500/30 text-amber-200 -mx-4 px-4 border-l-2 border-amber-500"
                          : ""
                      }
                    >
                      {`    while (!st.isEmpty() && st.peek() <= cur) {
      st.pop();
    }`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "check-range"
                          ? "bg-slate-700 text-white -mx-4 px-4"
                          : ""
                      }
                    >
                      {`    if (i < n) {`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "record-ans"
                          ? "bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500"
                          : ""
                      }
                    >
                      {`      ans[i] = st.isEmpty() ? -1 : st.peek();
    }`}
                    </div>
                    <div
                      className={
                        currentStep.codeLine === "push"
                          ? "bg-slate-600/50 text-white -mx-4 px-4 border-l-2 border-slate-400"
                          : ""
                      }
                    >
                      {`    st.push(cur);
  }`}
                    </div>
                    {`  return ans;
}`}
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
                    : "bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg hover:-translate-y-0.5"
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
