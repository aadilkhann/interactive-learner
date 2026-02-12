import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  StepBack, 
  RotateCcw, 
  Settings, 
  Info, 
  Layers,
  ArrowLeftToLine,
  ArrowRightToLine,
  Calculator
} from 'lucide-react';

// --- Types ---
interface StepState {
  // Data State
  stack: number[];
  left: (number | null)[];
  right: (number | null)[];
  ans: number;
  
  // Iteration State
  phase: 'left_pass' | 'right_pass' | 'calculate' | 'complete';
  currentIndex: number;
  compareIndex?: number; // The index from stack we are comparing
  
  // Visuals
  activeIndices: number[]; // Indices to highlight (e.g., current i, stack top)
  poppedIndex?: number;    // Index just popped from stack
  contributionHighlight?: { val: number, l: number, r: number, total: number };
  
  // Meta
  explanation: string;
  codeLine: string;
}

// --- Constants ---
const MAX_ARR_SIZE = 12;
const MAX_VAL = 50;
const MOD = 1_000_000_007;

export default function SubarrayMinsStackVisualizer() {
  // --- Inputs ---
  const [arr, setArr] = useState<number[]>([3, 1, 2, 4]);

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
    
    // Arrays to store results
    const leftArr = new Array(n).fill(null);
    const rightArr = new Array(n).fill(null);
    const stack: number[] = [];
    let ans = 0;

    // --- Init ---
    newSteps.push({
      stack: [],
      left: [...leftArr],
      right: [...rightArr],
      ans: 0,
      phase: 'left_pass',
      currentIndex: -1,
      activeIndices: [],
      explanation: "Initialize arrays for Left and Right distances. Initialize an empty stack.",
      codeLine: 'init'
    });

    // --- Phase 1: Previous Smaller Element (Left) ---
    for (let i = 0; i < n; i++) {
      newSteps.push({
        stack: [...stack],
        left: [...leftArr],
        right: [...rightArr],
        ans,
        phase: 'left_pass',
        currentIndex: i,
        activeIndices: [i],
        explanation: `Left Pass: Process index ${i} (Val: ${arr[i]}).`,
        codeLine: 'loop-left'
      });

      // While loop (Popping)
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        
        // Visual check step
        newSteps.push({
          stack: [...stack],
          left: [...leftArr],
          right: [...rightArr],
          ans,
          phase: 'left_pass',
          currentIndex: i,
          compareIndex: top,
          activeIndices: [i, top],
          explanation: `Compare current ${arr[i]} with stack top ${arr[top]}. Is ${arr[top]} > ${arr[i]}?`,
          codeLine: 'check-left-pop'
        });

        if (arr[top] > arr[i]) {
          stack.pop();
          newSteps.push({
            stack: [...stack],
            left: [...leftArr],
            right: [...rightArr],
            ans,
            phase: 'left_pass',
            currentIndex: i,
            poppedIndex: top,
            activeIndices: [i],
            explanation: `Yes, ${arr[top]} > ${arr[i]}. Pop index ${top} because we found a smaller element to its right.`,
            codeLine: 'check-left-pop'
          });
        } else {
          newSteps.push({
            stack: [...stack],
            left: [...leftArr],
            right: [...rightArr],
            ans,
            phase: 'left_pass',
            currentIndex: i,
            compareIndex: top,
            activeIndices: [i, top],
            explanation: `No, ${arr[top]} <= ${arr[i]}. Stop popping. Index ${top} is the previous smaller element.`,
            codeLine: 'check-left-pop'
          });
          break;
        }
      }

      // Calculate Left
      const dist = stack.length === 0 ? i + 1 : i - stack[stack.length - 1];
      leftArr[i] = dist;
      
      newSteps.push({
        stack: [...stack],
        left: [...leftArr],
        right: [...rightArr],
        ans,
        phase: 'left_pass',
        currentIndex: i,
        activeIndices: [i],
        explanation: stack.length === 0 
          ? `Stack empty. ${arr[i]} is smallest so far. Distance to left boundary = ${i + 1}.`
          : `Nearest smaller index is ${stack[stack.length - 1]}. Distance = ${i} - ${stack[stack.length - 1]} = ${dist}.`,
        codeLine: 'calc-left'
      });

      stack.push(i);
      newSteps.push({
        stack: [...stack],
        left: [...leftArr],
        right: [...rightArr],
        ans,
        phase: 'left_pass',
        currentIndex: i,
        activeIndices: [i],
        explanation: `Push index ${i} to stack.`,
        codeLine: 'push-left'
      });
    }

    // --- Transition ---
    stack.length = 0; // Clear stack
    newSteps.push({
      stack: [],
      left: [...leftArr],
      right: [...rightArr],
      ans,
      phase: 'right_pass',
      currentIndex: -1,
      activeIndices: [],
      explanation: "Left pass complete. Stack cleared. Starting Right Pass (Next Smaller or Equal).",
      codeLine: 'clear-stack'
    });

    // --- Phase 2: Next Smaller or Equal (Right) ---
    for (let i = n - 1; i >= 0; i--) {
      newSteps.push({
        stack: [...stack],
        left: [...leftArr],
        right: [...rightArr],
        ans,
        phase: 'right_pass',
        currentIndex: i,
        activeIndices: [i],
        explanation: `Right Pass: Process index ${i} (Val: ${arr[i]}).`,
        codeLine: 'loop-right'
      });

      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        
        newSteps.push({
          stack: [...stack],
          left: [...leftArr],
          right: [...rightArr],
          ans,
          phase: 'right_pass',
          currentIndex: i,
          compareIndex: top,
          activeIndices: [i, top],
          explanation: `Compare current ${arr[i]} with stack top ${arr[top]}. Is ${arr[top]} >= ${arr[i]}? (Handling duplicates via >=)`,
          codeLine: 'check-right-pop'
        });

        if (arr[top] >= arr[i]) {
          stack.pop();
           newSteps.push({
            stack: [...stack],
            left: [...leftArr],
            right: [...rightArr],
            ans,
            phase: 'right_pass',
            currentIndex: i,
            poppedIndex: top,
            activeIndices: [i],
            explanation: `Yes, ${arr[top]} >= ${arr[i]}. Pop index ${top}.`,
            codeLine: 'check-right-pop'
          });
        } else {
           newSteps.push({
            stack: [...stack],
            left: [...leftArr],
            right: [...rightArr],
            ans,
            phase: 'right_pass',
            currentIndex: i,
            compareIndex: top,
            activeIndices: [i, top],
            explanation: `No, ${arr[top]} < ${arr[i]}. Stop popping. Index ${top} is the next strictly smaller element.`,
            codeLine: 'check-right-pop'
          });
          break;
        }
      }

      const dist = stack.length === 0 ? n - i : stack[stack.length - 1] - i;
      rightArr[i] = dist;

      newSteps.push({
        stack: [...stack],
        left: [...leftArr],
        right: [...rightArr],
        ans,
        phase: 'right_pass',
        currentIndex: i,
        activeIndices: [i],
        explanation: stack.length === 0
          ? `Stack empty. ${arr[i]} is smallest to the right. Distance to right boundary = ${n - i}.`
          : `Nearest smaller index is ${stack[stack.length - 1]}. Distance = ${stack[stack.length - 1]} - ${i} = ${dist}.`,
        codeLine: 'calc-right'
      });

      stack.push(i);
      newSteps.push({
        stack: [...stack],
        left: [...leftArr],
        right: [...rightArr],
        ans,
        phase: 'right_pass',
        currentIndex: i,
        activeIndices: [i],
        explanation: `Push index ${i} to stack.`,
        codeLine: 'push-right'
      });
    }

    // --- Phase 3: Calculation ---
    newSteps.push({
      stack: [],
      left: [...leftArr],
      right: [...rightArr],
      ans,
      phase: 'calculate',
      currentIndex: -1,
      activeIndices: [],
      explanation: "Both passes complete. Now calculating total sum of minimums.",
      codeLine: 'calc-loop'
    });

    for (let i = 0; i < n; i++) {
      const l = leftArr[i]!;
      const r = rightArr[i]!;
      const contribution = (arr[i] * l * r);
      const newAns = (ans + contribution) % MOD;

      newSteps.push({
        stack: [],
        left: [...leftArr],
        right: [...rightArr],
        ans: newAns,
        phase: 'calculate',
        currentIndex: i,
        activeIndices: [i],
        contributionHighlight: { val: arr[i], l, r, total: contribution },
        explanation: `Index ${i} (Val: ${arr[i]}) is min for ${l} subarrays ending at i, and ${r} starting at i. Total subarrays: ${l} * ${r} = ${l*r}. Contribution: ${arr[i]} * ${l*r} = ${contribution}.`,
        codeLine: 'calc-ans'
      });
      ans = newAns;
    }

    // --- Complete ---
    newSteps.push({
      stack: [],
      left: [...leftArr],
      right: [...rightArr],
      ans,
      phase: 'complete',
      currentIndex: -1,
      activeIndices: [],
      explanation: `Finished! Total Sum of Subarray Minimums: ${ans}`,
      codeLine: 'return'
    });

    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  // --- Controls ---
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
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
    if (/^[\d, ]*$/.test(val)) {
      const parts = val.split(',').map(s => s.trim()).filter(s => s !== '').map(Number);
      if (parts.length <= MAX_ARR_SIZE && parts.every(n => n <= MAX_VAL)) {
        setArr(parts);
      }
    }
  };

  // --- Render Helpers ---
  const currentStep = steps[currentStepIndex];

  // Prevent rendering if steps haven't generated yet
  if (!currentStep) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Initializing Visualization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Layers className="text-indigo-600" size={20} />
          <h1 className="font-bold text-lg">Sum of Subarray Minimums <span className="text-slate-400 font-normal text-sm ml-2">Monotonic Stack</span></h1>
        </div>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Settings size={16} />
          Configure
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Configuration Panel */}
        <div className={`${isConfigOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col shrink-0`}>
          <div className="p-6 space-y-6">
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Input Array (comma separated)</label>
              <input 
                type="text" 
                value={arr.join(', ')}
                onChange={handleArrChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                placeholder="3, 1, 2, 4"
              />
              <p className="text-xs text-slate-400 mt-1">Max {MAX_ARR_SIZE} items, values ≤ {MAX_VAL}.</p>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <label className="block text-sm font-semibold text-slate-700 mb-2">Animation Speed</label>
              <input 
                type="range" 
                min="100" 
                max="2000" 
                step="100"
                value={2100 - playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(2100 - parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800">
              <p className="font-semibold mb-1 flex items-center gap-1"><Info size={12}/> Strategy</p>
              For each element <code>arr[i]</code>, we find how many subarrays have <code>arr[i]</code> as their minimum.
              <br/><br/>
              This is determined by finding the nearest smaller elements to the <strong>Left</strong> and <strong>Right</strong>.
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
                     <span className={`px-2 py-1 rounded border ${currentStep?.phase === 'left_pass' ? 'bg-blue-100 border-blue-200 text-blue-700 font-bold' : 'text-slate-400 border-transparent'}`}>Phase 1: Left</span>
                     <span className={`px-2 py-1 rounded border ${currentStep?.phase === 'right_pass' ? 'bg-purple-100 border-purple-200 text-purple-700 font-bold' : 'text-slate-400 border-transparent'}`}>Phase 2: Right</span>
                     <span className={`px-2 py-1 rounded border ${currentStep?.phase === 'calculate' ? 'bg-emerald-100 border-emerald-200 text-emerald-700 font-bold' : 'text-slate-400 border-transparent'}`}>Phase 3: Calc</span>
                  </div>
                </div>

                <div className="flex-1 p-8 flex flex-col relative overflow-auto">
                    
                    {/* Calculation Overlay */}
                    {currentStep?.phase === 'calculate' && currentStep.contributionHighlight && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-lg z-20 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
                        <Calculator className="text-emerald-500" size={24}/>
                        <div className="font-mono text-emerald-900 text-lg">
                          <span className="font-bold">{currentStep.contributionHighlight.val}</span>
                          <span className="mx-2 text-slate-400">×</span>
                          <span className="bg-blue-100 px-1 rounded text-blue-700">{currentStep.contributionHighlight.l}</span> (Left)
                          <span className="mx-2 text-slate-400">×</span>
                          <span className="bg-purple-100 px-1 rounded text-purple-700">{currentStep.contributionHighlight.r}</span> (Right)
                          <span className="mx-2">=</span>
                          <span className="font-bold text-xl underline decoration-emerald-500 decoration-2 underline-offset-4">{currentStep.contributionHighlight.total}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-1 gap-8 items-center justify-center">
                         
                         {/* Stack Visualization */}
                         <div className={`w-24 flex flex-col items-center justify-end h-64 border-r border-slate-200 pr-8 mr-4 self-center transition-opacity duration-300 ${currentStep?.phase === 'calculate' || currentStep?.phase === 'complete' ? 'opacity-30 blur-[1px]' : 'opacity-100'}`}>
                            <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Monotonic Stack</div>
                            <div className="flex flex-col-reverse gap-1 w-full flex-1 justify-start">
                                {currentStep?.stack.map((idx, stackPos) => (
                                    <div 
                                        key={`${idx}-${stackPos}`} 
                                        className={`
                                            h-10 w-full flex items-center justify-between px-2 rounded border font-mono text-sm transition-all duration-300
                                            ${idx === currentStep.compareIndex ? 'bg-amber-100 border-amber-400 text-amber-800 scale-105 shadow-md z-10' : 'bg-slate-100 border-slate-300 text-slate-600'}
                                        `}
                                    >
                                        <span className="font-bold text-[10px]">i:{idx}</span>
                                        <span className="text-xs font-bold">{arr[idx]}</span>
                                    </div>
                                ))}
                                {currentStep?.stack.length === 0 && (
                                    <div className="text-xs text-slate-300 text-center italic py-4 border-2 border-dashed border-slate-100 rounded">Empty</div>
                                )}
                            </div>
                            <div className="mt-2 text-[10px] text-slate-400 text-center">Stores indices</div>
                        </div>

                         {/* Main Array Visualization */}
                         <div className="flex-1 flex items-end justify-center gap-2 h-64 relative">
                             {arr.map((val, idx) => {
                                 const isCurrent = idx === currentStep?.currentIndex;
                                 const isCompare = idx === currentStep?.compareIndex;
                                 const isStack = currentStep?.stack.includes(idx);
                                 const isPopped = idx === currentStep?.poppedIndex;
                                 
                                 let barColor = 'bg-slate-200';
                                 let borderColor = 'border-slate-200';
                                 
                                 if (currentStep?.phase === 'left_pass') {
                                    if (isPopped) { barColor = 'bg-rose-400'; borderColor = 'border-rose-500'; }
                                    else if (isCurrent) { barColor = 'bg-blue-500'; borderColor = 'border-blue-600'; }
                                    else if (isCompare) { barColor = 'bg-amber-400'; borderColor = 'border-amber-500'; }
                                    else if (isStack) { barColor = 'bg-slate-400'; }
                                 } else if (currentStep?.phase === 'right_pass') {
                                    if (isPopped) { barColor = 'bg-rose-400'; borderColor = 'border-rose-500'; }
                                    else if (isCurrent) { barColor = 'bg-purple-500'; borderColor = 'border-purple-600'; }
                                    else if (isCompare) { barColor = 'bg-amber-400'; borderColor = 'border-amber-500'; }
                                    else if (isStack) { barColor = 'bg-slate-400'; }
                                 } else if (currentStep?.phase === 'calculate') {
                                     if (isCurrent) { barColor = 'bg-emerald-500'; borderColor = 'border-emerald-600'; }
                                 }

                                 const heightPct = Math.max(15, (val / Math.max(...arr)) * 100);

                                 return (
                                     <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                                         {/* Top Value */}
                                         <span className={`text-sm font-bold mb-2 transition-all ${isCurrent || isCompare ? 'scale-125 text-slate-800' : 'text-slate-400'}`}>{val}</span>
                                         
                                         {/* Bar */}
                                         <div 
                                            className={`w-full rounded-t-lg transition-all duration-300 border-x border-t-2 ${barColor} ${borderColor} ${isPopped ? 'opacity-50 translate-y-4' : ''}`}
                                            style={{ height: `${heightPct}%` }}
                                         ></div>
                                         
                                         {/* Index */}
                                         <div className={`mt-2 w-6 h-6 flex items-center justify-center rounded-full text-xs font-mono border transition-colors ${isCurrent ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-400'}`}>
                                             {idx}
                                         </div>
                                     </div>
                                 )
                             })}
                         </div>

                         {/* Right Side Arrays */}
                         <div className="flex gap-4 h-64 border-l border-slate-200 pl-6 ml-2 self-center">
                            {/* Left Array Column */}
                            <div className="w-20 flex flex-col">
                                <div className="text-xs font-bold text-center text-blue-600 mb-2 uppercase tracking-wider">Left[]</div>
                                <div className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1">
                                    {arr.map((_, idx) => {
                                        const val = currentStep?.left[idx];
                                        // Highlight during Left Pass OR Calculation phase for the current index
                                        const isActive = (currentStep.phase === 'left_pass' && currentStep.currentIndex === idx && currentStep.codeLine === 'calc-left') || 
                                                         (currentStep.phase === 'calculate' && currentStep.currentIndex === idx);
                                        return (
                                            <div key={`l-${idx}`} className={`flex justify-between items-center px-2 py-1 rounded text-xs border ${isActive ? 'bg-blue-100 border-blue-400 text-blue-800 font-bold scale-105 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500'} transition-all`}>
                                                <span className="opacity-50 w-4 font-mono">{idx}</span>
                                                <span className="font-mono">{val !== null ? val : '-'}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Right Array Column */}
                            <div className="w-20 flex flex-col">
                                <div className="text-xs font-bold text-center text-purple-600 mb-2 uppercase tracking-wider">Right[]</div>
                                <div className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1">
                                    {arr.map((_, idx) => {
                                        const val = currentStep?.right[idx];
                                        // Highlight during Right Pass OR Calculation phase for the current index
                                        const isActive = (currentStep.phase === 'right_pass' && currentStep.currentIndex === idx && currentStep.codeLine === 'calc-right') || 
                                                         (currentStep.phase === 'calculate' && currentStep.currentIndex === idx);
                                        return (
                                            <div key={`r-${idx}`} className={`flex justify-between items-center px-2 py-1 rounded text-xs border ${isActive ? 'bg-purple-100 border-purple-400 text-purple-800 font-bold scale-105 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500'} transition-all`}>
                                                <span className="opacity-50 w-4 font-mono">{idx}</span>
                                                <span className="font-mono">{val !== null ? val : '-'}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="border-t border-slate-100 bg-slate-50 p-4 flex justify-between items-center">
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                             <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                             <span className="text-xs text-slate-500 font-medium">Left Pass (i)</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                             <span className="text-xs text-slate-500 font-medium">Right Pass (i)</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-3 h-3 bg-amber-400 rounded-sm"></div>
                             <span className="text-xs text-slate-500 font-medium">Stack Compare</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-3 h-3 bg-rose-400 rounded-sm"></div>
                             <span className="text-xs text-slate-500 font-medium">Popped</span>
                        </div>
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                        Total Sum: <span className="font-mono text-emerald-600 text-lg">{currentStep?.ans}</span>
                    </div>
                </div>
              </div>

              {/* Code Panel */}
              <div className="w-full xl:w-96 bg-slate-900 rounded-xl shadow-sm overflow-hidden flex flex-col shrink-0">
                <div className="p-3 bg-slate-800 border-b border-slate-700 text-slate-300 font-sans font-semibold text-xs">
                  Java Solution
                </div>
                <div className="p-4 text-slate-300 overflow-auto flex-1 font-mono text-xs leading-loose">
<pre>
{`public int sumSubarrayMins(int[] arr) {
  int n = arr.length;
  int[] left = new int[n];
  int[] right = new int[n];
  Deque<Integer> stack = new ArrayDeque<>();`}

  <div className={currentStep?.codeLine === 'loop-left' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`  // Left Pass
  for (int i = 0; i < n; i++) {`}
  </div>
  <div className={currentStep?.codeLine === 'check-left-pop' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`    while (!stack.isEmpty() && arr[stack.peek()] > arr[i]) {
      stack.pop();
    }`}
  </div>
  <div className={currentStep?.codeLine === 'calc-left' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`    left[i] = stack.isEmpty() ? i + 1 : i - stack.peek();`}
  </div>
  <div className={currentStep?.codeLine === 'push-left' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`    stack.push(i);
  }`}
  </div>

  <div className={currentStep?.codeLine === 'clear-stack' ? 'bg-slate-700 text-white -mx-4 px-4' : ''}>
{`  stack.clear();`}
  </div>

  <div className={currentStep?.codeLine === 'loop-right' ? 'bg-purple-500/30 text-purple-200 -mx-4 px-4 border-l-2 border-purple-500' : ''}>
{`  // Right Pass
  for (int i = n - 1; i >= 0; i--) {`}
  </div>
  <div className={currentStep?.codeLine === 'check-right-pop' ? 'bg-purple-500/30 text-purple-200 -mx-4 px-4 border-l-2 border-purple-500' : ''}>
{`    while (!stack.isEmpty() && arr[stack.peek()] >= arr[i]) {
      stack.pop();
    }`}
  </div>
  <div className={currentStep?.codeLine === 'calc-right' ? 'bg-purple-500/30 text-purple-200 -mx-4 px-4 border-l-2 border-purple-500' : ''}>
{`    right[i] = stack.isEmpty() ? n - i : stack.peek() - i;`}
  </div>
  <div className={currentStep?.codeLine === 'push-right' ? 'bg-purple-500/30 text-purple-200 -mx-4 px-4 border-l-2 border-purple-500' : ''}>
{`    stack.push(i);
  }`}
  </div>

  <div className={currentStep?.codeLine === 'calc-loop' ? 'bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500' : ''}>
{`  long ans = 0;
  for (int i = 0; i < n; i++) {`}
  </div>
  <div className={currentStep?.codeLine === 'calc-ans' ? 'bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500' : ''}>
{`    ans = (ans + (long)arr[i] * left[i] * right[i]) % MOD;
  }`}
  </div>
{`  return (int)ans;
}`}
</pre>
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
                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1"/>}
              </button>
              
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button onClick={handlePrev} disabled={currentStepIndex === 0} className="p-2 hover:bg-white rounded-md disabled:opacity-30 transition-colors">
                  <StepBack size={20} />
                </button>
                <button onClick={handleNext} disabled={currentStepIndex === steps.length - 1} className="p-2 hover:bg-white rounded-md disabled:opacity-30 transition-colors">
                  <StepForward size={20} />
                </button>
              </div>

              <button onClick={handleReset} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors ml-2">
                <RotateCcw size={20} />
              </button>
            </div>

            <div className="flex flex-col items-end max-w-xl text-right">
               <div className="text-sm font-medium text-slate-900 animate-pulse-once transition-all">
                 {currentStep?.explanation}
               </div>
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