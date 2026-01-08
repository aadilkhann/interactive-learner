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
  ArrowDownToLine,
  ArrowUpFromLine,
  Maximize
} from 'lucide-react';

// --- Types ---
interface StepState {
  // Data State
  stack: number[]; // Stores indices
  maxWidth: number;
  
  // Iteration State
  phase: 'build_stack' | 'find_width' | 'complete';
  currentIndex: number; // 'i' in both loops
  compareIndex?: number; // The index from stack top we are comparing against
  
  // Visuals
  activeIndices: number[]; // Indices to highlight
  rampStart?: number; // For drawing the ramp line
  rampEnd?: number;   // For drawing the ramp line
  currentWidth?: number;
  
  // Meta
  explanation: string;
  codeLine: string;
}

// --- Constants ---
const MAX_ARR_SIZE = 15;
const MAX_VAL = 50;

export default function MaxWidthRampVisualizer() {
  // --- Inputs ---
  const [arr, setArr] = useState<number[]>([6, 0, 8, 2, 1, 5]);

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
    let maxWidth = 0;

    // --- Init ---
    newSteps.push({
      stack: [],
      maxWidth: 0,
      phase: 'build_stack',
      currentIndex: -1,
      activeIndices: [],
      explanation: "Initialize an empty stack. We will perform two passes over the array.",
      codeLine: 'init'
    });

    // --- Pass 1: Build Stack ---
    for (let i = 0; i < n; i++) {
      // Highlight current
      newSteps.push({
        stack: [...stack],
        maxWidth: 0,
        phase: 'build_stack',
        currentIndex: i,
        activeIndices: [i],
        explanation: `Pass 1 (Forward): Checking index ${i} (Value: ${arr[i]}).`,
        codeLine: 'loop-1'
      });

      if (stack.length === 0 || arr[i] < arr[stack[stack.length - 1]]) {
        const topIdx = stack.length > 0 ? stack[stack.length - 1] : -1;
        stack.push(i);
        newSteps.push({
          stack: [...stack],
          maxWidth: 0,
          phase: 'build_stack',
          currentIndex: i,
          activeIndices: [i],
          explanation: stack.length === 1 
            ? `Stack is empty. Push index ${i} as a potential ramp start.`
            : `Value ${arr[i]} < ${arr[topIdx]} (Stack Top). Push index ${i} because it's smaller and occurs later.`,
          codeLine: 'check-push'
        });
      } else {
        const topIdx = stack[stack.length - 1];
        newSteps.push({
          stack: [...stack],
          maxWidth: 0,
          phase: 'build_stack',
          currentIndex: i,
          compareIndex: topIdx,
          activeIndices: [i, topIdx],
          explanation: `Value ${arr[i]} >= ${arr[topIdx]} (Stack Top). We ignore this. Why? Because if ${arr[i]} starts a ramp, ${arr[topIdx]} is to its left and smaller, so ${arr[topIdx]} would produce a wider ramp for the same end point.`,
          codeLine: 'check-push' // Effectively skipped
        });
      }
    }

    // --- Transition ---
    newSteps.push({
      stack: [...stack],
      maxWidth: 0,
      phase: 'find_width',
      currentIndex: n,
      activeIndices: [],
      explanation: "Stack built with a strictly decreasing subsequence. Now starting Pass 2 (Backward) to find maximum width.",
      codeLine: 'init-ans'
    });

    // --- Pass 2: Find Width ---
    for (let i = n - 1; i >= 0; i--) {
      newSteps.push({
        stack: [...stack],
        maxWidth,
        phase: 'find_width',
        currentIndex: i,
        activeIndices: [i],
        explanation: `Pass 2 (Backward): Checking index ${i} (Value: ${arr[i]}).`,
        codeLine: 'loop-2'
      });

      while (stack.length > 0 && arr[i] >= arr[stack[stack.length - 1]]) {
        const topIdx = stack[stack.length - 1];
        const width = i - topIdx;
        const newMax = Math.max(maxWidth, width);
        
        // Before Pop - Show success
        newSteps.push({
          stack: [...stack],
          maxWidth, // Not updated yet visually
          phase: 'find_width',
          currentIndex: i,
          compareIndex: topIdx,
          activeIndices: [i, topIdx],
          rampStart: topIdx,
          rampEnd: i,
          currentWidth: width,
          explanation: `Found Ramp! ${arr[i]} >= ${arr[topIdx]} (Stack Top). Width = ${i} - ${topIdx} = ${width}.`,
          codeLine: 'check-pop'
        });

        maxWidth = newMax;
        stack.pop();

        // After Pop - Update Max
        newSteps.push({
          stack: [...stack],
          maxWidth, 
          phase: 'find_width',
          currentIndex: i,
          activeIndices: [i], // Stack top gone
          explanation: `Updated Max Width to ${maxWidth}. Popped index ${topIdx} to see if ${arr[i]} can form a ramp with the next stack element.`,
          codeLine: 'update-ans'
        });
      }

      // Check failure explanation
      if (stack.length > 0) {
         const topIdx = stack[stack.length - 1];
         newSteps.push({
          stack: [...stack],
          maxWidth,
          phase: 'find_width',
          currentIndex: i,
          compareIndex: topIdx,
          activeIndices: [i, topIdx],
          explanation: `Value ${arr[i]} < ${arr[topIdx]} (Stack Top). Cannot form a ramp. Move to next index (leftwards).`,
          codeLine: 'loop-2'
        });
      }
    }

    // --- Complete ---
    newSteps.push({
      stack: [...stack],
      maxWidth,
      phase: 'complete',
      currentIndex: -1,
      activeIndices: [],
      explanation: `Algorithm finished. Maximum Width Ramp is ${maxWidth}.`,
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

  // --- Input Handlers ---
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

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Maximize className="text-blue-600" size={20} />
          <h1 className="font-bold text-lg">Maximum Width Ramp <span className="text-slate-400 font-normal text-sm ml-2">Monotonic Stack</span></h1>
        </div>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
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
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="6, 0, 8, 2, 1, 5"
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
                className="w-full accent-blue-600"
              />
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-md p-3 text-xs text-amber-800">
              <p className="font-semibold mb-1 flex items-center gap-1"><Info size={12}/> Problem</p>
              A <strong>ramp</strong> is a pair <code>(i, j)</code> for which <code>i &lt; j</code> and <code>nums[i] &lt;= nums[j]</code>. The width is <code>j - i</code>.
            </div>

            <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500">Legend</div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                    <span>Current Index (i)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 bg-indigo-200 border border-indigo-400 rounded-sm"></div>
                    <span>Stack Index</span>
                </div>
                 <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                    <span>Valid Ramp Found</span>
                </div>
            </div>
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex flex-col xl:flex-row gap-6 h-full">
              
              {/* Visualizer Container */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                    Visualization
                  </h2>
                  <div className="flex items-center gap-4 text-sm font-mono">
                     <span className={`px-2 py-1 rounded border ${currentStep?.phase === 'build_stack' ? 'bg-indigo-100 border-indigo-200 text-indigo-700 font-bold' : 'text-slate-400 border-transparent'}`}>Phase 1: Build Stack</span>
                     <span className={`px-2 py-1 rounded border ${currentStep?.phase === 'find_width' ? 'bg-emerald-100 border-emerald-200 text-emerald-700 font-bold' : 'text-slate-400 border-transparent'}`}>Phase 2: Find Width</span>
                  </div>
                </div>

                <div className="flex-1 p-8 flex flex-col relative">
                    {/* Max Width Scoreboard */}
                    <div className="absolute top-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg">
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Max Width</div>
                        <div className="text-2xl font-bold font-mono text-center">{currentStep?.maxWidth}</div>
                    </div>

                    <div className="flex-1 flex gap-8 items-end justify-center mb-12">
                         {/* Stack Visualization */}
                         <div className="w-24 flex flex-col items-center justify-end self-stretch border-r border-slate-200 pr-8 mr-4">
                             <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Stack</div>
                             <div className="flex flex-col-reverse gap-1 w-full">
                                {currentStep?.stack.map((idx, stackPos) => (
                                    <div 
                                        key={`${idx}-${stackPos}`} 
                                        className={`
                                            h-10 w-full flex items-center justify-between px-3 rounded border font-mono text-sm transition-all duration-300
                                            ${idx === currentStep.compareIndex ? 'bg-amber-100 border-amber-400 text-amber-800 scale-105 shadow-md' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}
                                        `}
                                    >
                                        <span className="font-bold">idx:{idx}</span>
                                        <span className="text-xs opacity-70">v:{arr[idx]}</span>
                                    </div>
                                ))}
                                {currentStep?.stack.length === 0 && (
                                    <div className="text-xs text-slate-300 text-center italic py-4 border-2 border-dashed border-slate-100 rounded">Empty</div>
                                )}
                             </div>
                             <div className="mt-2 text-[10px] text-slate-400 text-center">Stores decreasing indices</div>
                         </div>

                         {/* Array Bar Chart */}
                         <div className="flex-1 flex items-end justify-center gap-2 h-64 relative">
                             {/* Ramp Line Overlay */}
                             {currentStep?.rampStart !== undefined && currentStep?.rampEnd !== undefined && (
                                <div className="absolute top-0 left-0 right-0 h-full pointer-events-none z-10">
                                    <svg width="100%" height="100%" className="overflow-visible">
                                        <defs>
                                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill="#059669" />
                                            </marker>
                                        </defs>
                                        {/* We need to calculate precise positions, simplified here using percentages logic relative to bar count if possible, 
                                            but in React simplified, we might just draw a connecting line if we had refs. 
                                            Instead, let's use a simpler visual: Highlights on the bars themselves are often enough. 
                                            Let's add a textual annotation above the bars. */}
                                    </svg>
                                    
                                    {/* Calculated Width Annotation */}
                                    <div 
                                        className="absolute top-0 border-b-2 border-emerald-500 flex items-center justify-center text-emerald-700 font-bold bg-emerald-50/80 px-2 rounded-t"
                                        style={{
                                            left: `${(currentStep.rampStart / arr.length) * 100}%`,
                                            width: `${((currentStep.rampEnd - currentStep.rampStart + 1) / arr.length) * 100}%` // Approx width
                                        }}
                                    >
                                        Width: {currentStep.currentWidth}
                                    </div>
                                </div>
                             )}

                             {arr.map((val, idx) => {
                                 const isCurrent = idx === currentStep?.currentIndex;
                                 const isCompare = idx === currentStep?.compareIndex;
                                 const isStack = currentStep?.stack.includes(idx);
                                 
                                 let barColor = 'bg-slate-200';
                                 let borderColor = 'border-transparent';
                                 
                                 if (currentStep?.phase === 'build_stack') {
                                     if (isCurrent) { barColor = 'bg-blue-500'; }
                                     else if (isCompare) { barColor = 'bg-amber-400'; }
                                     else if (isStack) { barColor = 'bg-indigo-300'; }
                                 } else if (currentStep?.phase === 'find_width') {
                                     if (currentStep.rampEnd === idx) { barColor = 'bg-emerald-500'; } // Successful ramp end
                                     else if (currentStep.rampStart === idx) { barColor = 'bg-emerald-300'; } // Successful ramp start
                                     else if (isCurrent) { barColor = 'bg-purple-500'; }
                                     else if (isCompare) { barColor = 'bg-amber-400'; }
                                     else if (isStack) { barColor = 'bg-indigo-200'; }
                                 }

                                 const heightPct = Math.max(10, (val / Math.max(...arr)) * 100);

                                 return (
                                     <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                                         {/* Value Label */}
                                         <span className={`text-xs font-bold mb-1 ${isCurrent || isCompare ? 'text-slate-800 scale-110' : 'text-slate-400'}`}>{val}</span>
                                         
                                         {/* Bar */}
                                         <div 
                                            className={`w-full rounded-t-md transition-all duration-300 border-t border-x ${barColor} ${borderColor}`}
                                            style={{ height: `${heightPct}%` }}
                                         ></div>
                                         
                                         {/* Index Label */}
                                         <div className={`mt-2 w-6 h-6 flex items-center justify-center rounded-full text-xs font-mono border ${isCurrent ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                                             {idx}
                                         </div>

                                         {/* Labels for specific roles */}
                                         {isCurrent && (
                                             <div className="absolute -bottom-8 flex flex-col items-center">
                                                 <ArrowUpFromLine size={12} className={currentStep.phase === 'build_stack' ? "text-blue-500" : "text-purple-500"}/>
                                                 <span className={`text-[10px] font-bold ${currentStep.phase === 'build_stack' ? "text-blue-500" : "text-purple-500"}`}>
                                                     {currentStep.phase === 'build_stack' ? 'i' : 'j'}
                                                 </span>
                                             </div>
                                         )}
                                         {isCompare && (
                                              <div className="absolute -bottom-8 flex flex-col items-center">
                                                 <ArrowUpFromLine size={12} className="text-amber-500"/>
                                                 <span className="text-[10px] font-bold text-amber-500">top</span>
                                              </div>
                                         )}
                                     </div>
                                 )
                             })}
                         </div>
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
{`public int maxWidthRamp(int[] nums) {
  int n = nums.length;
  Stack<Integer> st = new Stack<>();`}
  <div className={currentStep?.codeLine === 'loop-1' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`  for (int i = 0; i < n; i++) {`}
  </div>
  <div className={currentStep?.codeLine === 'check-push' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`    if (st.isEmpty() || nums[i] < nums[st.peek()]) {
      st.push(i);
    }`}
  </div>
{`  }`}

  <div className={currentStep?.codeLine === 'init-ans' ? 'bg-slate-700 text-white -mx-4 px-4' : ''}>
{`  int ans = 0;`}
  </div>
  <div className={currentStep?.codeLine === 'loop-2' ? 'bg-purple-500/30 text-purple-200 -mx-4 px-4 border-l-2 border-purple-500' : ''}>
{`  for (int i = n - 1; i >= 0; i--) {`}
  </div>
  <div className={currentStep?.codeLine === 'check-pop' ? 'bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500' : ''}>
{`    while (!st.isEmpty() && nums[i] >= nums[st.peek()]) {
      ans = Math.max(ans, i - st.peek());
      st.pop();
    }`}
  </div>
  <div className={currentStep?.codeLine === 'update-ans' ? 'bg-slate-700 text-white -mx-4 px-4' : ''}>
{`  }`}
  </div>
  <div className={currentStep?.codeLine === 'return' ? 'bg-slate-700 text-white -mx-4 px-4' : ''}>
{`  return ans;
}`}
  </div>
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