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
  ArrowRight,
  Maximize,
  Check,
  X,
  Search
} from 'lucide-react';

// --- Types ---
interface Envelope {
  w: number;
  h: number;
  id: number; // Original index for tracking
}

interface StepState {
  // Data State
  envelopes: Envelope[];
  lis: number[]; // The 'tails' array for LIS
  lisSize: number;
  
  // Iteration State
  phase: 'sort' | 'process_env' | 'binary_search' | 'update_lis' | 'complete';
  currentIndex: number; // Index in sorted envelopes
  
  // Binary Search State
  bsLow?: number;
  bsHigh?: number;
  bsMid?: number;
  bsTarget?: number;
  
  // Visuals
  insertionIndex?: number; // Where the element will be placed
  
  // Meta
  explanation: string;
  codeLine: string;
}

// --- Constants ---
const MAX_ENV_COUNT = 15;

export default function RussianDollVisualizer() {
  // --- Inputs ---
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
      const cleanStr = inputStr.replace(/\s/g, '');
      const pairs: number[][] = [];
      const regex = /\[(\d+),(\d+)\]/g;
      let match;
      while ((match = regex.exec(cleanStr)) !== null) {
        pairs.push([parseInt(match[1]), parseInt(match[2])]);
      }

      if (pairs.length === 0) return;

      const envelopes: Envelope[] = pairs.map((p, idx) => ({ w: p[0], h: p[1], id: idx }));
      generateSteps(envelopes);
    } catch (e) {
      console.error("Invalid input format");
    }
  };

  const generateSteps = (initialEnvelopes: Envelope[]) => {
    const newSteps: StepState[] = [];
    const n = initialEnvelopes.length;
    
    // 1. Sort Phase
    let envs = [...initialEnvelopes];
    
    newSteps.push({
      envelopes: [...envs],
      lis: new Array(n).fill(0),
      lisSize: 0,
      phase: 'sort',
      currentIndex: -1,
      explanation: "Initial state. Need to sort envelopes.",
      codeLine: 'init'
    });

    // Sort: Width ASC, Height DESC
    envs.sort((a, b) => {
      if (a.w !== b.w) return a.w - b.w;
      return b.h - a.h; // Note the change here!
    });

    newSteps.push({
      envelopes: [...envs],
      lis: new Array(n).fill(0),
      lisSize: 0,
      phase: 'sort',
      currentIndex: -1,
      explanation: "Sorted! Width ASC. If Widths equal, Height DESC (e.g., [6,7] before [6,4]). This allows us to simply find LIS on Heights.",
      codeLine: 'sort'
    });

    // 2. LIS Phase
    const lis = new Array(n).fill(0);
    let size = 0;

    for (let i = 0; i < n; i++) {
        const h = envs[i].h;
        
        newSteps.push({
            envelopes: [...envs],
            lis: [...lis],
            lisSize: size,
            phase: 'process_env',
            currentIndex: i,
            explanation: `Processing Envelope ${i}: [${envs[i].w}, ${envs[i].h}]. Looking for insertion point for Height ${h} in LIS array.`,
            codeLine: 'loop'
        });

        // Binary Search
        let low = 0;
        let high = size; // Exclusive upper bound for Java's binarySearch logic simulation
        
        // Manual BS visual steps
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            
            newSteps.push({
                envelopes: [...envs],
                lis: [...lis],
                lisSize: size,
                phase: 'binary_search',
                currentIndex: i,
                bsLow: low,
                bsHigh: high,
                bsMid: mid,
                bsTarget: h,
                explanation: `Binary Search: Low=${low}, High=${high}, Mid=${mid}. LIS[${mid}]=${lis[mid]}. Is ${lis[mid]} < ${h}?`,
                codeLine: 'binary-search'
            });

            if (lis[mid] < h) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        const idx = low;
        
        // Update LIS
        const isAppend = idx === size;
        const prevVal = lis[idx];
        lis[idx] = h;
        if (isAppend) size++;

        newSteps.push({
            envelopes: [...envs],
            lis: [...lis],
            lisSize: size,
            phase: 'update_lis',
            currentIndex: i,
            insertionIndex: idx,
            explanation: isAppend 
                ? `Height ${h} is larger than all tails. Extend LIS! New size: ${size}.`
                : `Height ${h} replaces ${prevVal} at index ${idx}. This keeps the increasing subsequence tail small to extend easier later.`,
            codeLine: isAppend ? 'extend' : 'replace'
        });
    }

    // Complete
    newSteps.push({
      envelopes: [...envs],
      lis: [...lis],
      lisSize: size,
      phase: 'complete',
      currentIndex: -1,
      explanation: `Done! The length of the Longest Increasing Subsequence is ${size}.`,
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

  // Scale visuals
  const getMaxDim = (envs: Envelope[]) => {
    let max = 0;
    envs.forEach(e => max = Math.max(max, e.w, e.h));
    return max || 1;
  };

  const renderEnvelope = (w: number, h: number, colorClass: string, label?: string) => {
    const maxDim = currentStep ? getMaxDim(currentStep.envelopes) : 10;
    const baseScale = 80 / maxDim;
    const widthPx = w * baseScale;
    const heightPx = h * baseScale;

    return (
      <div 
        className={`border-2 flex items-center justify-center relative transition-all duration-300 ${colorClass} shadow-sm`}
        style={{ width: Math.max(20, widthPx), height: Math.max(20, heightPx) }}
      >
        <span className="text-[10px] font-bold bg-white/90 px-1 rounded backdrop-blur-sm pointer-events-none whitespace-nowrap">
          {label || `[${w}, ${h}]`}
        </span>
      </div>
    );
  };

  if (!currentStep) return <div className="p-8 text-center text-slate-500">Initializing...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Layers className="text-pink-600" size={20} />
          <h1 className="font-bold text-lg">Russian Doll Envelopes <span className="text-slate-400 font-normal text-sm ml-2">LIS O(N log N)</span></h1>
        </div>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-100'}`}
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
              <label className="block text-sm font-semibold text-slate-700 mb-2">Envelopes Input</label>
              <input 
                type="text" 
                value={inputStr}
                onChange={(e) => setInputStr(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-pink-500 font-mono text-sm"
                placeholder="[w,h], [w,h]..."
              />
              <p className="text-xs text-slate-400 mt-1">Format: <code>[w,h],[w,h]...</code></p>
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
                className="w-full accent-pink-600"
              />
            </div>

            <div className="bg-pink-50 border border-pink-100 rounded-md p-3 text-xs text-pink-800">
              <p className="font-semibold mb-1 flex items-center gap-1"><Info size={12}/> Strategy</p>
              1. Sort by <strong>Width ASC</strong>. <br/>
              2. If Widths equal, sort by <strong>Height DESC</strong>. <br/>
              3. Find <strong>LIS</strong> on Heights using Binary Search.
              <br/><br/>
              The Height DESC sort ensures we don't accidentally nest envelopes of the same width (since [3,4] comes before [3,3], 3 can't extend 4).
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
                  <h2 className="font-semibold text-slate-700 flex items-center gap-2">Visualization</h2>
                  <div className="flex items-center gap-3 text-sm font-mono">
                     <span className={`px-2 py-1 rounded border ${currentStep.phase === 'sort' ? 'bg-amber-100 border-amber-200 text-amber-700 font-bold' : 'text-slate-400 border-transparent'}`}>Sort</span>
                     <span className={`px-2 py-1 rounded border ${currentStep.phase === 'binary_search' ? 'bg-blue-100 border-blue-200 text-blue-700 font-bold' : 'text-slate-400 border-transparent'}`}>Search</span>
                     <span className={`px-2 py-1 rounded border ${currentStep.phase === 'update_lis' ? 'bg-emerald-100 border-emerald-200 text-emerald-700 font-bold' : 'text-slate-400 border-transparent'}`}>Update</span>
                  </div>
                </div>

                <div className="flex-1 p-8 flex flex-col items-center gap-10 overflow-auto">
                    
                    {/* Current Envelope Showcase */}
                    <div className="h-32 w-full flex flex-col items-center justify-center gap-2">
                        {currentStep.currentIndex !== -1 && currentStep.currentIndex < currentStep.envelopes.length && (
                            <>
                                <div className="text-xs font-bold text-slate-400 uppercase">Processing</div>
                                {renderEnvelope(
                                    currentStep.envelopes[currentStep.currentIndex].w,
                                    currentStep.envelopes[currentStep.currentIndex].h,
                                    'bg-pink-100 border-pink-500 text-pink-900',
                                    `Current Height: ${currentStep.envelopes[currentStep.currentIndex].h}`
                                )}
                            </>
                        )}
                        {currentStep.phase === 'sort' && <div className="text-slate-400 italic">Sorting Envelopes...</div>}
                    </div>

                    {/* LIS Array Visualization */}
                    <div className="w-full flex flex-col items-center">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span>LIS Array (Tails)</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">Size: {currentStep.lisSize}</span>
                        </div>
                        
                        <div className="flex gap-1 bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-[100px] items-center overflow-x-auto max-w-full">
                            {Array.from({length: Math.max(1, currentStep.lisSize + (currentStep.phase === 'update_lis' && currentStep.insertionIndex === currentStep.lisSize ? 0 : 1))}).map((_, idx) => {
                                // Only render indices relevant to current size or just beyond
                                if (idx > currentStep.lisSize) return null;
                                
                                const val = currentStep.lis[idx];
                                const isFilled = idx < currentStep.lisSize;
                                const isTarget = idx === currentStep.insertionIndex;
                                const isBsRange = currentStep.phase === 'binary_search' && 
                                                  idx >= (currentStep.bsLow ?? -1) && 
                                                  idx < (currentStep.bsHigh ?? -1);
                                const isMid = currentStep.phase === 'binary_search' && idx === currentStep.bsMid;

                                let bgClass = 'bg-white text-slate-300 border-slate-200';
                                if (isFilled) bgClass = 'bg-slate-100 text-slate-700 border-slate-300';
                                if (isBsRange) bgClass = 'bg-blue-50 text-blue-700 border-blue-200';
                                if (isMid) bgClass = 'bg-blue-200 text-blue-800 border-blue-400 ring-2 ring-blue-200';
                                if (isTarget) bgClass = 'bg-emerald-100 text-emerald-800 border-emerald-500 ring-2 ring-emerald-200 scale-110';

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-1">
                                        <div className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 font-mono font-bold text-lg transition-all duration-300 ${bgClass}`}>
                                            {isFilled || isTarget ? val : ''}
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-mono text-slate-400">{idx}</span>
                                            {isMid && <span className="text-[10px] font-bold text-blue-500">mid</span>}
                                        </div>
                                    </div>
                                );
                            })}
                            {currentStep.lisSize === 0 && <span className="text-sm text-slate-400 italic">Empty</span>}
                        </div>
                    </div>

                    {/* Envelopes Queue (Sorted) */}
                    <div className="w-full overflow-x-auto">
                        <div className="flex gap-2 min-w-max pb-2 px-2">
                            {currentStep.envelopes.map((env, idx) => {
                                const isCurrent = idx === currentStep.currentIndex;
                                const isProcessed = idx < currentStep.currentIndex;
                                return (
                                    <div key={env.id} className={`transition-all duration-500 ${isCurrent ? 'scale-110 opacity-100' : (isProcessed ? 'opacity-40' : 'opacity-70')}`}>
                                        {renderEnvelope(env.w, env.h, isCurrent ? 'bg-pink-50 border-pink-400' : 'bg-white border-slate-300')}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* Footer Info */}
                <div className="border-t border-slate-100 bg-slate-50 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        {currentStep.phase === 'sort' && <span className="text-amber-600 font-medium">Sorting...</span>}
                        {currentStep.phase === 'binary_search' && <span className="text-blue-600 font-medium flex items-center gap-1"><Search size={14}/> Binary Search for {currentStep.bsTarget}</span>}
                        {currentStep.phase === 'update_lis' && <span className="text-emerald-600 font-medium">Updating LIS table</span>}
                    </div>
                    {currentStep.phase === 'complete' && (
                        <div className="px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold border border-emerald-200">
                            Result: {currentStep.lisSize}
                        </div>
                    )}
                </div>
              </div>

              {/* Code Panel */}
              <div className="w-full xl:w-96 bg-slate-900 rounded-xl shadow-sm overflow-hidden flex flex-col shrink-0">
                <div className="p-3 bg-slate-800 border-b border-slate-700 text-slate-300 font-sans font-semibold text-xs">
                  Java Solution (O(N log N))
                </div>
                <div className="p-4 text-slate-300 overflow-auto flex-1 font-mono text-xs leading-loose">
<pre>
{`public int maxEnvelopes(int[][] envelopes) {
  if (envelopes.length == 0) return 0;

  // Step 1: Sort
  Arrays.sort(envelopes, (a, b) -> {`}
  <div className={currentStep.codeLine === 'sort' ? 'bg-amber-500/30 text-amber-200 -mx-4 px-4 border-l-2 border-amber-500' : ''}>
{`    if (a[0] == b[0]) return b[1] - a[1];
    return a[0] - b[0];
  });`}
  </div>

  <div className={currentStep.codeLine === 'init' ? 'bg-slate-700 text-white -mx-4 px-4' : ''}>
{`  // Step 2: LIS on heights
  int[] lis = new int[envelopes.length];
  int size = 0;`}
  </div>

  <div className={currentStep.codeLine === 'loop' ? 'bg-pink-500/30 text-pink-200 -mx-4 px-4 border-l-2 border-pink-500' : ''}>
{`  for (int[] env : envelopes) {
    int h = env[1];`}
  </div>
  <div className={currentStep.codeLine === 'binary-search' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`    int idx = Arrays.binarySearch(lis, 0, size, h);
    if (idx < 0) idx = -(idx + 1);`}
  </div>
  <div className={currentStep.codeLine === 'replace' || currentStep.codeLine === 'extend' ? 'bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500' : ''}>
{`    lis[idx] = h;
    if (idx == size) size++;
  }`}
  </div>
  <div className={currentStep.codeLine === 'return' ? 'bg-slate-700 text-white -mx-4 px-4' : ''}>
{`  return size;
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
                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                    : 'bg-pink-600 text-white hover:bg-pink-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
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