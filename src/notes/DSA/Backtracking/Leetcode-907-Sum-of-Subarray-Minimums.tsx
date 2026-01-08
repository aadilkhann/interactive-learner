import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  StepBack, 
  RotateCcw, 
  Settings, 
  Info, 
  Sigma,
  ArrowRight
} from 'lucide-react';

// --- Types ---
interface StepState {
  startIdx: number;   // The fixed start of the subarray
  endIdx: number;     // The current moving end pointer (recursion depth)
  currentMin: number; // The min value of the current subarray
  addedVal: number;   // value added to sum in this step
  totalSum: number;   // Global answer
  explanation: string;
  subarrayStr: string;
}

// --- Constants ---
const MOD = 1_000_000_007;

export default function SubarrayMinsVisualizer() {
  // --- State ---
  const [arr, setArr] = useState<number[]>([3, 1, 2, 4]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isConfigOpen, setIsConfigOpen] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Logic Generation ---
  useEffect(() => {
    generateSteps();
  }, [arr]);

  const generateSteps = () => {
    const newSteps: StepState[] = [];
    const n = arr.length;
    let totalSum = 0;

    // Simulation of the User's Java Code
    // Outer loop: fixed start
    for (let i = 0; i < n; i++) {
      // Simulate the recursive backtrack function iteratively
      // backtrack(arr, start, idx, currentMin)
      
      let currentMin = Infinity;
      
      for (let idx = i; idx < n; idx++) {
        // Logic inside recursion:
        // currentMin = Math.min(currentMin, arr[idx]);
        currentMin = Math.min(currentMin, arr[idx]);
        
        // ans = (ans + currentMin) % MOD;
        totalSum = (totalSum + currentMin) % MOD;

        newSteps.push({
          startIdx: i,
          endIdx: idx,
          currentMin: currentMin,
          addedVal: currentMin,
          totalSum: totalSum,
          subarrayStr: `[${arr.slice(i, idx + 1).join(', ')}]`,
          explanation: `Subarray [${i}...${idx}]: New element is ${arr[idx]}. Min(${currentMin}, ${arr[idx]}) = ${currentMin}. Add ${currentMin} to total.`
        });
        
        // Recursive call happens here effectively by continuing loop
      }
    }

    // Final Done Step
    newSteps.push({
        startIdx: -1,
        endIdx: -1,
        currentMin: 0,
        addedVal: 0,
        totalSum: totalSum,
        subarrayStr: "Complete",
        explanation: "All subarrays processed."
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
      if (parts.length > 0 && parts.length <= 15) {
        setArr(parts);
      }
    }
  };

  // --- Render Helpers ---
  const currentStep = steps[currentStepIndex];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <Sigma className="text-blue-600" size={20} />
          <h1 className="font-bold text-lg">Sum of Subarray Minimums <span className="text-slate-400 font-normal text-sm ml-2">Backtracking Approach</span></h1>
        </div>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Settings size={16} />
          Configs
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Config Panel */}
        <div className={`${isConfigOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col shrink-0`}>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Input Array</label>
              <input 
                type="text" 
                value={arr.join(', ')}
                onChange={handleArrChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="3, 1, 2, 4"
              />
              <p className="text-xs text-slate-400 mt-1">Comma separated numbers.</p>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <label className="block text-sm font-semibold text-slate-700 mb-2">Animation Speed</label>
              <input 
                type="range" 
                min="100" 
                max="1000" 
                step="50"
                value={1100 - playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(1100 - parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800">
              <p className="font-semibold mb-1 flex items-center gap-1"><Info size={12}/> Approach</p>
              This visualizer follows your exact backtracking logic:
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Fix <code>start</code> index.</li>
                <li>Recurse to increase <code>idx</code> (end).</li>
                <li>Maintain <code>currentMin</code> as we expand.</li>
                <li>Sum up results.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center">
            
            {/* Top Stats */}
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Min</span>
                    <span className="text-3xl font-bold text-amber-500 mt-1">
                        {currentStep ? (currentStep.startIdx === -1 ? '-' : currentStep.currentMin) : '-'}
                    </span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Adding to Ans</span>
                    <span className="text-3xl font-bold text-emerald-600 mt-1 flex items-center gap-2">
                        {currentStep && currentStep.startIdx !== -1 && (
                            <span className="text-sm text-slate-300 font-normal">+</span>
                        )}
                        {currentStep ? (currentStep.startIdx === -1 ? 'Done' : currentStep.addedVal) : '-'}
                    </span>
                    {/* Animated background pulse on change could go here */}
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center bg-slate-900 text-white">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sum</span>
                    <span className="text-3xl font-bold mt-1">{currentStep?.totalSum}</span>
                </div>
            </div>

            {/* Array Visualization */}
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6 min-h-[200px] flex items-center justify-center">
                <div className="flex gap-2">
                    {arr.map((val, idx) => {
                        const isInSubarray = currentStep && currentStep.startIdx !== -1 && idx >= currentStep.startIdx && idx <= currentStep.endIdx;
                        const isStart = currentStep && idx === currentStep.startIdx;
                        const isEnd = currentStep && idx === currentStep.endIdx;
                        const isMin = currentStep && isInSubarray && val === currentStep.currentMin;

                        return (
                            <div key={idx} className="flex flex-col items-center gap-2 group">
                                <div 
                                    className={`
                                        w-14 h-14 flex items-center justify-center rounded-lg text-lg font-bold border-2 transition-all duration-300
                                        ${isInSubarray ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50 border-slate-100 text-slate-300'}
                                        ${isMin ? 'ring-4 ring-amber-200 border-amber-400 bg-amber-50 text-amber-900 scale-110 z-10' : ''}
                                        ${isEnd && !isMin ? 'border-blue-500 ring-2 ring-blue-200' : ''}
                                    `}
                                >
                                    {val}
                                </div>
                                <div className="h-6 relative w-full flex justify-center">
                                    {isStart && (
                                        <div className="absolute top-0 text-[10px] font-bold text-blue-500 uppercase">Start</div>
                                    )}
                                    {isEnd && (
                                        <div className="absolute top-0 text-[10px] font-bold text-blue-500 uppercase translate-y-3">End</div>
                                    )}
                                </div>
                                <span className="text-xs text-slate-400 font-mono">{idx}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

             {/* Code Context */}
             <div className="w-full max-w-4xl bg-slate-900 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 bg-slate-800 border-b border-slate-700 text-slate-300 font-sans font-semibold text-xs flex justify-between">
                  <span>Logic Trace</span>
                  <span>{currentStep?.subarrayStr}</span>
                </div>
                <div className="p-4 text-slate-300 font-mono text-sm">
                    {currentStep?.startIdx !== -1 ? (
                        <>
                            <div className="text-slate-500">
                                // 1. Recursed to index {currentStep?.endIdx}
                            </div>
                            <div className="mt-1">
                                <span className="text-purple-400">currentMin</span> = Math.min({currentStep?.currentMin === currentStep?.addedVal && currentStep?.endIdx === currentStep?.startIdx ? 'Infinity' : 'prevMin'}, arr[{currentStep?.endIdx}]) 
                                <span className="text-slate-500"> // = {currentStep?.currentMin}</span>
                            </div>
                            <div className="mt-1">
                                <span className="text-blue-400">ans</span> = (ans + <span className="text-purple-400">currentMin</span>) % MOD
                                <span className="text-slate-500"> // + {currentStep?.addedVal}</span>
                            </div>
                        </>
                    ) : (
                        <div className="text-emerald-400">Traversal Complete. Final Answer Returned.</div>
                    )}
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
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
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