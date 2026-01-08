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
  Search,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';

// --- Types ---
interface StepState {
  // Binary Search State
  lo: number;
  hi: number;
  mid: number;
  res: number;

  // Check Function State
  phase: 'search' | 'check_start' | 'check_process' | 'check_result';
  checkIndex?: number;      // Current element being processed in check()
  currentSum?: number;      // Running sum of current partition
  partitionCount?: number;  // Number of partitions used so far
  splitIndices: number[];   // Indices where splits happened (visual markers)
  
  // Meta
  explanation: string;
  codeLine: string;
  isFeasible?: boolean;     // Result of check()
}

// --- Constants ---
const MAX_VAL = 100; // Limit input values for better UI scaling
const MAX_ARR_SIZE = 12;

export default function SplitArrayVisualizer() {
  // --- Inputs ---
  const [arr, setArr] = useState<number[]>([7, 2, 5, 10, 8]);
  const [k, setK] = useState<number>(2);

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
  }, [arr, k]);

  const generateSteps = () => {
    const newSteps: StepState[] = [];
    const n = arr.length;
    
    // Bounds
    let lo = Math.max(...arr);
    let hi = arr.reduce((a, b) => a + b, 0);
    let res = -1;

    // Initial Step
    newSteps.push({
      lo, hi, mid: -1, res,
      phase: 'search',
      checkIndex: -1,
      currentSum: 0,
      partitionCount: 0,
      splitIndices: [],
      explanation: `Initialize Binary Search range. Low (max element) = ${lo}, High (sum of array) = ${hi}.`,
      codeLine: 'init',
    });

    while (lo <= hi) {
      const mid = Math.floor(lo + (hi - lo) / 2);

      // Step: New Mid Calculation
      newSteps.push({
        lo, hi, mid, res,
        phase: 'check_start',
        checkIndex: -1,
        currentSum: 0,
        partitionCount: 1,
        splitIndices: [],
        explanation: `Test Capacity: ${mid}. Can we split the array into ≤ ${k} subarrays where each sum ≤ ${mid}?`,
        codeLine: 'calc-mid',
      });

      // --- Simulate Check Function ---
      let partitions = 1;
      let currentSum = 0;
      let splits: number[] = [];
      let isPossible = true; // Assume possible unless logic proves otherwise (though logic here counts partitions)

      for (let i = 0; i < n; i++) {
        const val = arr[i];
        
        // Step: Processing Element
        newSteps.push({
          lo, hi, mid, res,
          phase: 'check_process',
          checkIndex: i,
          currentSum,
          partitionCount: partitions,
          splitIndices: [...splits],
          explanation: `Checking element ${val}. Current Sum: ${currentSum}.`,
          codeLine: 'check-loop',
        });

        if (currentSum + val > mid) {
          // Need to split
          partitions++;
          splits.push(i); // Split happens BEFORE index i
          currentSum = val;
          
          newSteps.push({
            lo, hi, mid, res,
            phase: 'check_process',
            checkIndex: i,
            currentSum,
            partitionCount: partitions,
            splitIndices: [...splits],
            explanation: `Adding ${val} exceeds limit ${mid}. SPLIT! New partition starts at ${val}. Count: ${partitions}`,
            codeLine: 'check-split',
          });
        } else {
          currentSum += val;
          newSteps.push({
            lo, hi, mid, res,
            phase: 'check_process',
            checkIndex: i,
            currentSum,
            partitionCount: partitions,
            splitIndices: [...splits],
            explanation: `Adding ${val} fits (${currentSum} ≤ ${mid}). Continue.`,
            codeLine: 'check-add',
          });
        }
      }

      // Check Result
      const valid = partitions <= k;
      
      newSteps.push({
        lo, hi, mid, res,
        phase: 'check_result',
        checkIndex: n - 1,
        currentSum,
        partitionCount: partitions,
        splitIndices: [...splits],
        isFeasible: valid,
        explanation: `Check complete. Partitions Needed: ${partitions}. Target (k): ${k}. ${valid ? 'Valid! (Try smaller capacity)' : 'Invalid! (Need larger capacity)'}`,
        codeLine: 'check-return',
      });

      if (valid) {
        res = mid;
        hi = mid - 1;
        newSteps.push({
          lo, hi, mid, res,
          phase: 'search',
          splitIndices: [...splits], // Keep visuals for context
          explanation: `Store result ${res}. Try lower half: set High = ${mid - 1}.`,
          codeLine: 'update-hi',
        });
      } else {
        lo = mid + 1;
        newSteps.push({
          lo, hi, mid, res,
          phase: 'search',
          splitIndices: [...splits],
          explanation: `Capacity too small. Try upper half: set Low = ${mid + 1}.`,
          codeLine: 'update-lo',
        });
      }
    }

    // Final
    newSteps.push({
      lo, hi, mid: -1, res,
      phase: 'search',
      splitIndices: [],
      explanation: `Search complete. The minimal largest sum is ${res}.`,
      codeLine: 'return-res',
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

  // --- Input Handlers ---
  const handleArrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow numbers and commas
    if (/^[\d, ]*$/.test(val)) {
      const parts = val.split(',').map(s => s.trim()).filter(s => s !== '').map(Number);
      if (parts.length <= MAX_ARR_SIZE && parts.every(n => n <= MAX_VAL)) {
        setArr(parts);
      }
    }
  };

  // --- Render Helpers ---
  const currentStep = steps[currentStepIndex];

  // Helper to determine subarray colors based on split indices
  const getSubarrayColor = (index: number) => {
    if (!currentStep) return 'bg-slate-100 border-slate-200';
    
    let partitionIdx = 0;
    for (const splitIdx of currentStep.splitIndices) {
      if (index >= splitIdx) partitionIdx++;
    }

    // Checking phase logic
    if (currentStep.phase === 'check_process' && currentStep.checkIndex !== undefined) {
       if (index > currentStep.checkIndex) return 'bg-white border-slate-200 text-slate-300';
    }

    const colors = [
      'bg-blue-100 border-blue-300 text-blue-800',
      'bg-emerald-100 border-emerald-300 text-emerald-800',
      'bg-amber-100 border-amber-300 text-amber-800',
      'bg-purple-100 border-purple-300 text-purple-800',
      'bg-rose-100 border-rose-300 text-rose-800',
    ];
    return colors[partitionIdx % colors.length];
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Layers className="text-indigo-600" size={20} />
          <h1 className="font-bold text-lg">Split Array Largest Sum <span className="text-slate-400 font-normal text-sm ml-2">Binary Search on Answer</span></h1>
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
                placeholder="7, 2, 5, 10, 8"
              />
              <p className="text-xs text-slate-400 mt-1">Max {MAX_ARR_SIZE} items.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Partitions (k)</label>
              <input 
                type="number" 
                value={k}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setK(Math.min(Math.max(1, val), arr.length));
                }}
                min="1"
                max={arr.length}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              />
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
              <p className="font-semibold mb-1 flex items-center gap-1"><Info size={12}/> Problem</p>
              Minimize the largest sum among <code>k</code> subarrays.
              <br/><br/>
              <strong>Strategy:</strong> Binary Search for the optimal "Max Capacity". For a given capacity, check if we can split the array into ≤ k parts.
            </div>
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex flex-col gap-6">
              
              {/* Top: Binary Search Range Visualizer */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-500 mb-4 flex items-center gap-2">
                  <Search size={16}/> Binary Search Range [Low, High]
                </h2>
                
                <div className="relative h-24 flex items-center px-8">
                  {/* Base Line */}
                  <div className="absolute left-8 right-8 h-1 bg-slate-100 rounded-full"></div>
                  
                  {currentStep && (
                    <>
                      {/* Active Range Bar */}
                      <div 
                        className="absolute h-2 bg-indigo-200 rounded-full transition-all duration-500"
                        style={{
                          left: `${((currentStep.lo - Math.max(...arr)) / (arr.reduce((a,b)=>a+b) - Math.max(...arr))) * 100}%`,
                          right: `${100 - ((currentStep.hi - Math.max(...arr)) / (arr.reduce((a,b)=>a+b) - Math.max(...arr))) * 100}%`
                        }}
                      ></div>

                      {/* LO Indicator */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500 z-10"
                        style={{ left: `${((currentStep.lo - Math.max(...arr)) / (arr.reduce((a,b)=>a+b) - Math.max(...arr))) * 100}%` }}
                      >
                         <div className="w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-sm mb-2"></div>
                         <div className="text-xs font-bold text-indigo-700">Lo: {currentStep.lo}</div>
                      </div>

                      {/* HI Indicator */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500 z-10"
                        style={{ left: `${((currentStep.hi - Math.max(...arr)) / (arr.reduce((a,b)=>a+b) - Math.max(...arr))) * 100}%` }}
                      >
                         <div className="w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-sm mb-2"></div>
                         <div className="text-xs font-bold text-indigo-700">Hi: {currentStep.hi}</div>
                      </div>

                      {/* MID Indicator (if active) */}
                      {currentStep.mid !== -1 && (
                        <div 
                          className="absolute top-0 bottom-0 border-l-2 border-dashed border-amber-500 flex flex-col items-center justify-start transition-all duration-500 z-20"
                          style={{ left: `${((currentStep.mid - Math.max(...arr)) / (arr.reduce((a,b)=>a+b) - Math.max(...arr))) * 100}%` }}
                        >
                           <div className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded border border-amber-200 -mt-3 shadow-sm whitespace-nowrap">
                             Mid: {currentStep.mid}
                           </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* Result Indicator */}
                <div className="flex justify-end mt-2">
                   <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                     Current Best Result (res): {currentStep?.res !== -1 ? <span className="text-emerald-600 font-bold">{currentStep?.res}</span> : 'None'}
                   </div>
                </div>
              </div>

              {/* Bottom Row: Check Visualizer & Code */}
              <div className="flex flex-col xl:flex-row gap-6 min-h-[400px]">
                
                {/* Check Function Visualizer */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                      <CheckCircle size={16}/> Capacity Check (Limit: {currentStep?.mid})
                    </h2>
                    <div className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">
                      Partition Count: <span className={`font-bold text-lg ${currentStep && currentStep.partitionCount! <= k ? 'text-emerald-600' : 'text-rose-600'}`}>{currentStep?.partitionCount}</span> / {k}
                    </div>
                  </div>

                  <div className="flex-1 p-8 flex flex-col items-center justify-center bg-slate-50/50 relative">
                     
                     {currentStep?.isFeasible !== undefined && (
                        <div className={`absolute inset-0 flex items-center justify-center bg-white/80 z-20 backdrop-blur-sm transition-opacity duration-500`}>
                           <div className={`text-4xl font-bold flex flex-col items-center gap-4 ${currentStep.isFeasible ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {currentStep.isFeasible ? <CheckCircle size={64}/> : <XCircle size={64}/>}
                             {currentStep.isFeasible ? 'Possible!' : 'Not Possible!'}
                           </div>
                        </div>
                     )}

                     {/* Array Visuals */}
                     <div className="flex flex-wrap gap-4 items-start justify-center max-w-4xl">
                        {arr.map((val, idx) => {
                          const isSplitStart = currentStep?.splitIndices.includes(idx);
                          return (
                            <div key={idx} className="flex items-center">
                              {/* Visual Split Divider */}
                              {isSplitStart && (
                                <div className="h-16 w-1 bg-rose-500 mx-2 rounded-full animate-bounce"></div>
                              )}
                              
                              <div className="flex flex-col items-center gap-2">
                                <div 
                                  className={`
                                    w-14 h-14 flex items-center justify-center rounded-lg border-2 text-lg font-bold shadow-sm transition-all duration-300
                                    ${getSubarrayColor(idx)}
                                    ${currentStep?.checkIndex === idx ? 'scale-110 ring-4 ring-indigo-200 z-10' : ''}
                                  `}
                                >
                                  {val}
                                </div>
                                <span className="text-xs text-slate-400 font-mono">{idx}</span>
                              </div>
                            </div>
                          );
                        })}
                     </div>

                     {/* Running Sum Indicator */}
                     {currentStep?.phase === 'check_process' && (
                       <div className="mt-12 bg-indigo-50 border border-indigo-200 text-indigo-800 px-6 py-3 rounded-full font-medium shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
                         <span>Current Partition Sum:</span>
                         <span className="text-2xl font-bold">{currentStep.currentSum}</span>
                         <span className="text-slate-400">/</span>
                         <span className="text-slate-500 font-mono">{currentStep.mid}</span>
                         {currentStep.currentSum! > currentStep.mid && <span className="text-rose-600 text-xs font-bold uppercase ml-2">Over Limit!</span>}
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
{`public boolean check(int[] arr, int k, int limit) {
  int cnt = 1, sum = 0;
  for (int x : arr) {`}
  <div className={currentStep?.codeLine.startsWith('check') ? 'bg-indigo-500/30 text-indigo-200 -mx-4 px-4 border-l-2 border-indigo-500 transition-colors' : ''}>
{`    if (sum + x > limit) {
      cnt++; sum = x;
    } else {
      sum += x;
    }`}
  </div>
{`  }
  return cnt <= k;
}

public int splitArray(int[] arr, int k) {
  int lo = max(arr), hi = sum(arr);`}
  <div className={currentStep?.codeLine === 'init' ? 'bg-indigo-500/30 text-indigo-200 -mx-4 px-4 border-l-2 border-indigo-500' : ''}>
{`  int res = -1;`}
  </div>
{`
  while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;`}
  <div className={currentStep?.codeLine === 'calc-mid' ? 'bg-indigo-500/30 text-indigo-200 -mx-4 px-4 border-l-2 border-indigo-500' : ''}>
{`    if (check(arr, k, mid)) {
      res = mid;
      hi = mid - 1;`}
  </div>
  <div className={currentStep?.codeLine === 'update-lo' ? 'bg-indigo-500/30 text-indigo-200 -mx-4 px-4 border-l-2 border-indigo-500' : ''}>
{`    } else {
      lo = mid + 1;
    }`}
  </div>
{`  }
  return res;
}`}
</pre>
                  </div>
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
               <div className="text-sm font-medium text-slate-900 animate-pulse-once">
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