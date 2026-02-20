import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  StepBack, 
  RotateCcw, 
  Settings, 
  Info,
  TrendingUp,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

// --- Types ---
interface StepState {
  // Data State
  nums: number[];
  
  // Iteration State
  phase: 'init' | 'check_neg' | 'swap' | 'calc_max' | 'calc_min' | 'update_res' | 'complete';
  currentIndex: number;
  
  // Variables
  currVal: number;
  maxSoFar: number;
  minSoFar: number;
  result: number;
  
  // Visuals
  prevMax: number; // For showing calculations
  prevMin: number; // For showing calculations
  didSwap: boolean;
  
  // Meta
  explanation: string;
  codeLine: string;
}

// --- Constants ---
const MAX_ARR_SIZE = 12;
const MAX_VAL = 20;

export default function MaxProductVisualizer() {
  // --- Inputs ---
  const [arrInput, setArrInput] = useState("2,3,-2,4");
  const [nums, setNums] = useState<number[]>([2, 3, -2, 4]);

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
    // Parse input
    const parts = arrInput.split(',').map(s => s.trim()).filter(s => s !== '');
    const validNums = parts.map(Number).filter(n => !isNaN(n));
    if (validNums.length > 0) {
        setNums(validNums);
    }
  }, [arrInput]);

  useEffect(() => {
    generateSteps();
  }, [nums]);

  const generateSteps = () => {
    if (nums.length === 0) return;

    const newSteps: StepState[] = [];
    
    // Initial State
    let maxSoFar = nums[0];
    let minSoFar = nums[0];
    let result = maxSoFar;

    newSteps.push({
      nums: [...nums],
      phase: 'init',
      currentIndex: 0,
      currVal: nums[0],
      maxSoFar, minSoFar, result,
      prevMax: nums[0], prevMin: nums[0], didSwap: false,
      explanation: `Initialize maxSoFar, minSoFar, and result with the first element: ${nums[0]}.`,
      codeLine: 'init'
    });

    for (let i = 1; i < nums.length; i++) {
      let curr = nums[i];
      let prevMax = maxSoFar;
      let prevMin = minSoFar;

      // 1. Check Negative
      newSteps.push({
        nums: [...nums],
        phase: 'check_neg',
        currentIndex: i,
        currVal: curr,
        maxSoFar, minSoFar, result,
        prevMax, prevMin, didSwap: false,
        explanation: `Process index ${i} (Value: ${curr}). Is ${curr} < 0?`,
        codeLine: 'loop-start'
      });

      let swapped = false;
      if (curr < 0) {
        // Swap logic
        let temp = maxSoFar;
        maxSoFar = minSoFar;
        minSoFar = temp;
        swapped = true;
        
        // Update prev references for calculations display after swap logic
        // Actually, for calculation display we want to show the values USED for calc.
        // If we swap, we use the swapped values. 
        
        newSteps.push({
          nums: [...nums],
          phase: 'swap',
          currentIndex: i,
          currVal: curr,
          maxSoFar, minSoFar, result, // Updated state
          prevMax, prevMin, didSwap: true, // Visual flag
          explanation: `Yes, ${curr} is negative. Multiplying by a negative flips signs, so max becomes min and min becomes max. Swap them!`,
          codeLine: 'swap'
        });
      }

      // Prepare for calculation display
      // We need to capture the state right before the calculation lines execute
      // but after the swap potentially happened.
      const calcPrevMax = maxSoFar; // This is what will be used in Math.max
      const calcPrevMin = minSoFar; // This is what will be used in Math.min

      // 2. Calc Max
      // maxSoFar = Math.max(curr, curr * maxSoFar);
      const newMax = Math.max(curr, curr * maxSoFar);
      
      newSteps.push({
        nums: [...nums],
        phase: 'calc_max',
        currentIndex: i,
        currVal: curr,
        maxSoFar, minSoFar, result,
        prevMax: calcPrevMax, prevMin: calcPrevMin, didSwap: false,
        explanation: `Update maxSoFar: Max(${curr}, ${curr} * ${calcPrevMax}) = ${newMax}.`,
        codeLine: 'calc-max'
      });
      
      maxSoFar = newMax;

      // 3. Calc Min
      // minSoFar = Math.min(curr, curr * minSoFar);
      // Note: In the original code, 'maxSoFar' is updated before 'minSoFar'.
      // If we strictly follow: maxSoFar = Math.max(...) updates maxSoFar.
      // Then minSoFar = Math.min(curr, curr * minSoFar) uses the OLD minSoFar (because of swap temp logic or just variable reuse).
      // Wait, the provided code uses:
      // int temp = maxSoFar; maxSoFar = minSoFar; minSoFar = temp; (IF negative)
      // Then: maxSoFar = Math.max(curr, curr * maxSoFar);
      // Then: minSoFar = Math.min(curr, curr * minSoFar);
      // This logic is correct because if negative, maxSoFar holds the old min, and minSoFar holds the old max.
      // So calculation uses the values currently in the variables.
      
      const newMin = Math.min(curr, curr * calcPrevMin);

      newSteps.push({
        nums: [...nums],
        phase: 'calc_min',
        currentIndex: i,
        currVal: curr,
        maxSoFar, minSoFar, result,
        prevMax: calcPrevMax, prevMin: calcPrevMin, didSwap: false,
        explanation: `Update minSoFar: Min(${curr}, ${curr} * ${calcPrevMin}) = ${newMin}.`,
        codeLine: 'calc-min'
      });

      minSoFar = newMin;

      // 4. Update Result
      const newResult = Math.max(result, maxSoFar);
      newSteps.push({
        nums: [...nums],
        phase: 'update_res',
        currentIndex: i,
        currVal: curr,
        maxSoFar, minSoFar, result: newResult,
        prevMax: calcPrevMax, prevMin: calcPrevMin, didSwap: false,
        explanation: `Update Global Max: Max(${result}, ${maxSoFar}) = ${newResult}.`,
        codeLine: 'update-res'
      });
      
      result = newResult;
    }

    newSteps.push({
      nums: [...nums],
      phase: 'complete',
      currentIndex: -1,
      currVal: 0,
      maxSoFar, minSoFar, result,
      prevMax: 0, prevMin: 0, didSwap: false,
      explanation: `Finished processing array. Maximum Product Subarray is ${result}.`,
      codeLine: 'return'
    });

    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  // --- Controls ---
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) setCurrentStepIndex(prev => prev + 1);
    else setIsPlaying(false);
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
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

  if (!currentStep) return <div className="p-8 text-center text-slate-500">Initializing...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-emerald-600" size={20} />
          <h1 className="font-bold text-lg">Maximum Product Subarray <span className="text-slate-400 font-normal text-sm ml-2">Kadane's Variation</span></h1>
        </div>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Settings size={16} />
          Config
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Configuration Panel */}
        <div className={`${isConfigOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col shrink-0`}>
          <div className="p-6 space-y-6">
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Input Array</label>
              <input 
                type="text" 
                value={arrInput}
                onChange={(e) => setArrInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                placeholder="2,3,-2,4"
              />
              <p className="text-xs text-slate-400 mt-1">Comma separated numbers.</p>
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
                className="w-full accent-emerald-600"
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3 text-xs text-emerald-800">
              <p className="font-semibold mb-1 flex items-center gap-1"><Info size={12}/> Logic</p>
              When a negative number is encountered, the maximum product could become the minimum (large negative) and vice versa. 
              <br/><br/>
              We maintain both <code>max</code> and <code>min</code> so far and swap them when we hit a negative number.
            </div>
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex flex-col xl:flex-row gap-6 h-full">
              
              {/* Visualizer Panel */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[400px] overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-700 flex items-center gap-2">Visualization</h2>
                  <div className="flex gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Max So Far</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Min So Far</span>
                  </div>
                </div>

                <div className="flex-1 p-8 flex flex-col items-center justify-start gap-12">
                    
                    {/* Array View */}
                    <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-4">
                        {nums.map((val, idx) => {
                            const isCurrent = idx === currentStep.currentIndex;
                            return (
                                <div key={idx} className="flex flex-col items-center gap-1">
                                    <div 
                                        className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 text-lg font-bold transition-all duration-300
                                            ${isCurrent ? 'bg-blue-500 border-blue-600 text-white scale-110 shadow-lg' : 'bg-white border-slate-200 text-slate-600'}
                                        `}
                                    >
                                        {val}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">{idx}</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* State Cards */}
                    <div className="flex gap-8 items-start">
                        {/* Swap Animation Container */}
                        <div className="relative w-64 h-32">
                            <div className={`absolute top-0 left-0 w-full transition-all duration-500 ${currentStep.didSwap ? 'translate-y-20' : 'translate-y-0'}`}>
                                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex justify-between items-center shadow-sm">
                                    <span className="text-xs font-bold text-emerald-700 uppercase">Max So Far</span>
                                    <span className="text-xl font-mono font-bold text-emerald-800">{currentStep.maxSoFar}</span>
                                </div>
                            </div>

                            <div className={`absolute top-20 left-0 w-full transition-all duration-500 ${currentStep.didSwap ? '-translate-y-20' : 'translate-y-0'}`}>
                                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg flex justify-between items-center shadow-sm">
                                    <span className="text-xs font-bold text-rose-700 uppercase">Min So Far</span>
                                    <span className="text-xl font-mono font-bold text-rose-800">{currentStep.minSoFar}</span>
                                </div>
                            </div>

                            {currentStep.didSwap && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white p-1 rounded-full border shadow-sm">
                                    <RefreshCw className="text-amber-500 animate-spin" size={20} />
                                </div>
                            )}
                        </div>

                        {/* Result Card */}
                        <div className="h-32 flex items-center">
                            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg min-w-[120px] text-center transition-all duration-300 transform">
                                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Global Max</div>
                                <div className="text-3xl font-mono font-bold text-yellow-400">{currentStep.result}</div>
                            </div>
                        </div>
                    </div>

                    {/* Calculation Details */}
                    {currentStep.phase === 'calc_max' && (
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                            <div className="text-xs font-bold text-slate-400 mb-2">Calculating New Max</div>
                            <div className="font-mono text-lg flex items-center gap-2">
                                <span className="text-slate-500">Max(</span>
                                <span className="font-bold text-blue-600">{currentStep.currVal}</span>
                                <span className="text-slate-400">,</span>
                                <span className="font-bold text-blue-600">{currentStep.currVal}</span>
                                <span className="text-slate-400">×</span>
                                <span className="font-bold text-emerald-600">{currentStep.prevMax}</span>
                                <span className="text-slate-500">)</span>
                                <ArrowRight size={16} className="text-slate-400"/>
                                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 rounded">{currentStep.maxSoFar}</span>
                            </div>
                        </div>
                    )}

                    {currentStep.phase === 'calc_min' && (
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                            <div className="text-xs font-bold text-slate-400 mb-2">Calculating New Min</div>
                            <div className="font-mono text-lg flex items-center gap-2">
                                <span className="text-slate-500">Min(</span>
                                <span className="font-bold text-blue-600">{currentStep.currVal}</span>
                                <span className="text-slate-400">,</span>
                                <span className="font-bold text-blue-600">{currentStep.currVal}</span>
                                <span className="text-slate-400">×</span>
                                <span className="font-bold text-rose-600">{currentStep.prevMin}</span>
                                <span className="text-slate-500">)</span>
                                <ArrowRight size={16} className="text-slate-400"/>
                                <span className="font-bold text-rose-700 bg-rose-100 px-2 rounded">{currentStep.minSoFar}</span>
                            </div>
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
{`public int maxProduct(int[] nums) {`}
  <div className={currentStep.codeLine === 'init' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`  int maxSoFar = nums[0];
  int minSoFar = nums[0];
  int result = nums[0];`}
  </div>

  <div className={currentStep.codeLine === 'loop-start' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`  for (int i = 1; i < nums.length; i++) {
    int curr = nums[i];`}
  </div>

  <div className={currentStep.codeLine === 'swap' ? 'bg-amber-500/30 text-amber-200 -mx-4 px-4 border-l-2 border-amber-500 transition-colors duration-500' : ''}>
{`    if (curr < 0) {
      int temp = maxSoFar;
      maxSoFar = minSoFar;
      minSoFar = temp;
    }`}
  </div>

  <div className={currentStep.codeLine === 'calc-max' ? 'bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500' : ''}>
{`    maxSoFar = Math.max(curr, curr * maxSoFar);`}
  </div>
  <div className={currentStep.codeLine === 'calc-min' ? 'bg-rose-500/30 text-rose-200 -mx-4 px-4 border-l-2 border-rose-500' : ''}>
{`    minSoFar = Math.min(curr, curr * minSoFar);`}
  </div>

  <div className={currentStep.codeLine === 'update-res' ? 'bg-yellow-500/30 text-yellow-200 -mx-4 px-4 border-l-2 border-yellow-500' : ''}>
{`    result = Math.max(result, maxSoFar);
  }`}
  </div>

  <div className={currentStep.codeLine === 'return' ? 'bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500' : ''}>
{`  return result;
}`}
  </div>
</pre>
                </div>
                
                {/* Explanation Box */}
                <div className="p-4 border-t border-slate-700 bg-slate-800 text-slate-300 text-sm min-h-[100px]">
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
                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
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