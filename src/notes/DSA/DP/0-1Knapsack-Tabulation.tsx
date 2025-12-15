import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  StepBack, 
  RotateCcw, 
  Settings, 
  X, 
  Calculator,
  Info
} from 'lucide-react';

// --- Types ---
interface Item {
  id: number;
  weight: number;
  value: number;
}

interface StepState {
  i: number; // Current Item Index (1-based for DP)
  j: number; // Current Capacity Index
  dp: number[][]; // Snapshot of the DP table
  phase: 'check' | 'update'; // 'check' condition, then 'update' value
  explanation: string;
  highlightRefs: { r: number; c: number; type: 'take' | 'not-take' | 'current' }[];
  codeLine: string; // ID of the code line to highlight
  calcDetails?: {
    weight: number;
    value: number;
    currentCap: number;
    canTake: boolean;
    takeVal?: number;
    notTakeVal?: number;
    prevDpTake?: number;
    prevDpNotTake?: number;
  };
}

// --- Constants ---
const MAX_CAPACITY_LIMIT = 20;
const MAX_ITEMS_LIMIT = 10;
const CELL_SIZE = 40; // px
const GAP_SIZE = 4;   // px
const STRIDE = CELL_SIZE + GAP_SIZE;

// --- Components ---

export default function KnapsackVisualizer() {
  // --- State ---
  // Input State
  const [capacity, setCapacity] = useState<number>(7);
  const [items, setItems] = useState<Item[]>([
    { id: 1, weight: 1, value: 1 },
    { id: 2, weight: 3, value: 4 },
    { id: 3, weight: 4, value: 5 },
    { id: 4, weight: 5, value: 7 },
  ]);
  
  // UI State
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Simulation State
  const [steps, setSteps] = useState<StepState[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Logic ---

  // Generate all simulation steps based on current inputs
  useEffect(() => {
    const n = items.length;
    const W = capacity;
    const newSteps: StepState[] = [];
    
    // Initialize DP table
    const dp: number[][] = Array(n + 1).fill(0).map(() => Array(W + 1).fill(0));

    // Initial state (empty table)
    newSteps.push({
      i: 0,
      j: 0,
      dp: JSON.parse(JSON.stringify(dp)),
      phase: 'check',
      explanation: 'Click "Step Forward" to start filling the table.',
      highlightRefs: [],
      codeLine: 'init',
      calcDetails: undefined
    });

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= W; j++) {
        const item = items[i - 1]; // items are 0-indexed
        const currentWeight = item.weight;
        const currentValue = item.value;
        
        // Phase 1: Check Logic
        newSteps.push({
          i,
          j,
          dp: JSON.parse(JSON.stringify(dp)),
          phase: 'check',
          explanation: `Checking Item ${i} (Wt: ${currentWeight}, Val: ${currentValue}) for Capacity ${j}.`,
          highlightRefs: [{ r: i, c: j, type: 'current' }],
          codeLine: 'check-weight',
          calcDetails: {
            weight: currentWeight,
            value: currentValue,
            currentCap: j,
            canTake: currentWeight <= j
          }
        });

        // Logic
        let newVal = 0;
        const refs: { r: number; c: number; type: 'take' | 'not-take' | 'current' }[] = [{ r: i, c: j, type: 'current' }];
        
        // Add references for visualizer
        refs.push({ r: i - 1, c: j, type: 'not-take' }); // Always compare with top
        
        let takeVal = -1;
        let notTakeVal = dp[i-1][j];
        
        if (currentWeight <= j) {
          refs.push({ r: i - 1, c: j - currentWeight, type: 'take' }); // Remainder cell
          
          const prevVal = dp[i - 1][j - currentWeight];
          takeVal = currentValue + prevVal;
          newVal = Math.max(takeVal, notTakeVal);
          
          // Phase 2: Update (Can Take)
          const dpCopy = JSON.parse(JSON.stringify(dp));
          dpCopy[i][j] = newVal; // We update the copy for the next step, but show calculation now
          
          newSteps.push({
            i,
            j,
            dp: JSON.parse(JSON.stringify(dp)), // Show old value being overwritten
            phase: 'update',
            explanation: `Can take item! Max(Take: ${currentValue} + ${prevVal}, Not Take: ${notTakeVal}) = ${newVal}`,
            highlightRefs: refs,
            codeLine: 'calc-max',
            calcDetails: {
              weight: currentWeight,
              value: currentValue,
              currentCap: j,
              canTake: true,
              takeVal: takeVal,
              notTakeVal: notTakeVal,
              prevDpTake: prevVal,
              prevDpNotTake: notTakeVal
            }
          });
          dp[i][j] = newVal; // Update real table for next loop
        } else {
           // Phase 2: Update (Cannot Take)
           newVal = notTakeVal;
           const dpCopy = JSON.parse(JSON.stringify(dp));
           dpCopy[i][j] = newVal;

           newSteps.push({
            i,
            j,
            dp: JSON.parse(JSON.stringify(dp)),
            phase: 'update',
            explanation: `Cannot take item (Weight ${currentWeight} > Capacity ${j}). Copy value from above.`,
            highlightRefs: refs,
            codeLine: 'calc-skip',
             calcDetails: {
              weight: currentWeight,
              value: currentValue,
              currentCap: j,
              canTake: false,
              notTakeVal: notTakeVal,
              prevDpNotTake: notTakeVal
            }
          });
          dp[i][j] = newVal;
        }
      }
    }
    
    // Final Step
    newSteps.push({
      i: n,
      j: W,
      dp: JSON.parse(JSON.stringify(dp)),
      phase: 'update',
      explanation: `Table Complete! Max Value: ${dp[n][W]}`,
      highlightRefs: [{ r: n, c: W, type: 'current' }],
      codeLine: 'return',
      calcDetails: undefined
    });

    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [items, capacity]);

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

  // Auto-play effect
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
  
  const addItem = () => {
    if (items.length >= MAX_ITEMS_LIMIT) return;
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    setItems([...items, { id: newId, weight: 1, value: 1 }]);
    handleReset();
  };

  const removeItem = (id: number) => {
    setItems(items.filter(i => i.id !== id));
    handleReset();
  };

  const updateItem = (id: number, field: 'weight' | 'value', val: string) => {
    const num = parseInt(val) || 0;
    setItems(items.map(i => i.id === id ? { ...i, [field]: num } : i));
    handleReset();
  };

  const updateCapacity = (val: string) => {
    let num = parseInt(val) || 0;
    if (num > MAX_CAPACITY_LIMIT) num = MAX_CAPACITY_LIMIT;
    setCapacity(num);
    handleReset();
  };

  // --- Render Helpers ---

  const currentStep = steps[currentStepIndex];
  
  const getCellClass = (r: number, c: number) => {
    if (!currentStep) return '';
    const ref = currentStep.highlightRefs.find(h => h.r === r && h.c === c);
    
    // Base style
    let base = `flex items-center justify-center border text-sm transition-colors duration-300 relative z-0 `;
    
    // Fixed Size
    const sizeStyle = { width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` };
    
    // Default border
    base += "border-slate-200 ";

    if (r === 0 || c === 0) {
      return { className: base + "bg-slate-50 text-slate-400 font-medium", style: sizeStyle };
    }

    if (!ref) {
      const isPast = r < currentStep.i || (r === currentStep.i && c < currentStep.j);
      return { className: base + (isPast ? "bg-white text-slate-700" : "bg-slate-50 text-slate-300"), style: sizeStyle };
    }

    if (ref.type === 'current') return { className: base + "bg-yellow-200 border-yellow-500 font-bold text-yellow-900 ring-2 ring-yellow-400 ring-inset z-10", style: sizeStyle };
    if (ref.type === 'not-take') return { className: base + "bg-blue-100 border-blue-400 text-blue-800 z-10", style: sizeStyle };
    if (ref.type === 'take') return { className: base + "bg-emerald-100 border-emerald-400 text-emerald-800 z-10", style: sizeStyle };
    
    return { className: base, style: sizeStyle };
  };

  const renderArrows = () => {
    if (!currentStep || currentStep.phase === 'check') return null;
    
    const target = currentStep.highlightRefs.find(h => h.type === 'current');
    const sources = currentStep.highlightRefs.filter(h => h.type !== 'current');
    
    if (!target || sources.length === 0) return null;

    return (
      <svg 
        className="absolute top-0 left-0 pointer-events-none z-20 overflow-visible"
        width="100%" 
        height="100%"
      >
        <defs>
          <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 L0,0" fill="#2563eb" />
          </marker>
          <marker id="arrow-emerald" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 L0,0" fill="#059669" />
          </marker>
        </defs>
        {sources.map((src, i) => {
          // Calculate centers
          const x1 = src.c * STRIDE + CELL_SIZE / 2;
          const y1 = src.r * STRIDE + CELL_SIZE / 2;
          const x2 = target.c * STRIDE + CELL_SIZE / 2;
          const y2 = target.r * STRIDE + CELL_SIZE / 2;

          // Determine if this arrow is the "winner" (max value)
          let isWinner = false;
          let isLoser = false;
          
          if (currentStep.calcDetails) {
            const { takeVal, notTakeVal, canTake } = currentStep.calcDetails;
            if (src.type === 'not-take') {
              if (!canTake || (notTakeVal! >= takeVal!)) isWinner = true;
              else isLoser = true;
            } else if (src.type === 'take') {
              if (canTake && takeVal! > notTakeVal!) isWinner = true;
              else isLoser = true;
            }
          }

          // Shorten line to not overlap text
          const dx = x2 - x1;
          const dy = y2 - y1;
          const angle = Math.atan2(dy, dx);
          const shorten = 16; 
          const x2s = x2 - shorten * Math.cos(angle);
          const y2s = y2 - shorten * Math.sin(angle);
          const x1s = x1 + shorten * Math.cos(angle);

          const color = src.type === 'take' ? '#059669' : '#2563eb'; // emerald-600 : blue-600
          const marker = src.type === 'take' ? 'url(#arrow-emerald)' : 'url(#arrow-blue)';

          return (
            <g key={i} className="transition-all duration-500 ease-out">
              <line 
                x1={x1s} y1={y1} x2={x2s} y2={y2s} 
                stroke={color} 
                strokeWidth={isWinner ? 2.5 : 1.5}
                strokeDasharray={isLoser ? "4,4" : "none"}
                opacity={isLoser ? 0.4 : 1}
                markerEnd={marker} 
              />
              {/* Value bubbles on the line? Optional visual aid */}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <Calculator className="text-blue-600" size={20} />
          <h1 className="font-bold text-lg">0/1 Knapsack Visualizer <span className="text-slate-400 font-normal text-sm ml-2">Tabulation Method</span></h1>
        </div>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Settings size={16} />
          Configure Inputs
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Configuration Panel */}
        <div className={`${isConfigOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col shrink-0`}>
          <div className="p-6 space-y-6 overflow-y-auto">
            
            {/* Capacity Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Knapsack Capacity (W)
              </label>
              <input 
                type="number" 
                value={capacity}
                onChange={(e) => updateCapacity(e.target.value)}
                min="1"
                max={MAX_CAPACITY_LIMIT}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <p className="text-xs text-slate-400 mt-1">Max capacity limited to {MAX_CAPACITY_LIMIT} for visibility.</p>
            </div>

            {/* Items Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Items</label>
                <button 
                  onClick={addItem}
                  disabled={items.length >= MAX_ITEMS_LIMIT}
                  className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
                >
                  + Add Item
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="grid grid-cols-6 gap-2 text-xs text-slate-500 font-medium px-1">
                  <span className="col-span-1 text-center">#</span>
                  <span className="col-span-2">Weight</span>
                  <span className="col-span-2">Value</span>
                  <span className="col-span-1"></span>
                </div>
                {items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-6 gap-2 items-center">
                    <span className="col-span-1 text-center text-sm font-bold text-slate-400">{idx + 1}</span>
                    <input 
                      type="number" 
                      min="1"
                      value={item.weight}
                      onChange={(e) => updateItem(item.id, 'weight', e.target.value)}
                      className="col-span-2 px-2 py-1 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                    />
                    <input 
                      type="number" 
                      min="1"
                      value={item.value}
                      onChange={(e) => updateItem(item.id, 'value', e.target.value)}
                      className="col-span-2 px-2 py-1 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                    />
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="col-span-1 flex justify-center text-slate-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
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
                onChange={(e) => setPlaybackSpeed(2100 - parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
               <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
              <p className="font-semibold flex items-center gap-1 mb-1"><Info size={12}/> Note</p>
              Changing inputs resets the simulation.
            </div>
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          {/* Main Workspace */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex flex-col xl:flex-row gap-6 h-full">
              
              {/* DP Table Container */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-w-[300px] overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h2 className="font-semibold text-slate-700">DP Table</h2>
                  <div className="flex gap-2 text-xs font-medium">
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200">Not Take</span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded border border-emerald-200">Take</span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded border border-yellow-200">Current</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
                  {currentStep && (
                    <div className="inline-block relative">
                      {/* Column Headers */}
                      <div className="flex ml-14 mb-2" style={{ gap: `${GAP_SIZE}px` }}>
                        {Array.from({ length: capacity + 1 }).map((_, j) => (
                          <div key={j} style={{ width: `${CELL_SIZE}px` }} className="text-center text-xs text-slate-400 font-mono">
                            {j}
                          </div>
                        ))}
                      </div>

                      <div className="flex">
                        {/* Row Headers */}
                        <div className="flex flex-col mr-2" style={{ gap: `${GAP_SIZE}px` }}>
                           <div style={{ height: `${CELL_SIZE}px` }} className="flex items-center justify-end text-xs font-bold text-slate-400 pr-2">
                            Base
                          </div>
                          {items.map((item, idx) => (
                            <div key={idx} style={{ height: `${CELL_SIZE}px` }} className="flex items-center justify-end text-xs font-medium text-slate-500 pr-2 whitespace-nowrap">
                              Item {idx + 1} <span className="text-[10px] text-slate-400 ml-1">({item.weight}kg, ${item.value})</span>
                            </div>
                          ))}
                        </div>

                        {/* Grid & Arrows Wrapper */}
                        <div className="relative">
                          {renderArrows()}
                          
                          <div className="flex flex-col" style={{ gap: `${GAP_SIZE}px` }}>
                            {currentStep.dp.map((row, r) => (
                              <div key={r} className="flex" style={{ gap: `${GAP_SIZE}px` }}>
                                {row.map((val, c) => {
                                  const { className, style } = getCellClass(r, c);
                                  return (
                                    <div key={`${r}-${c}`} className={className} style={style}>
                                      {val}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Code & Calculation */}
              <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0">
                
                {/* Current State Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 text-sm">
                    Current Step
                  </div>
                  <div className="p-4 space-y-4">
                     {/* Variables */}
                     <div className="grid grid-cols-2 gap-4 text-sm">
                       <div className="bg-slate-50 p-2 rounded border border-slate-100">
                         <span className="text-slate-500 block text-xs uppercase tracking-wider">Capacity (j)</span>
                         <span className="font-mono font-bold text-lg text-slate-800">{currentStep?.calcDetails?.currentCap ?? '-'}</span>
                       </div>
                       <div className="bg-slate-50 p-2 rounded border border-slate-100">
                         <span className="text-slate-500 block text-xs uppercase tracking-wider">Item Weight</span>
                         <span className="font-mono font-bold text-lg text-slate-800">{currentStep?.calcDetails?.weight ?? '-'}</span>
                       </div>
                     </div>

                     {/* Decision Logic Display */}
                     {currentStep?.calcDetails ? (
                       <div className="space-y-2">
                          <div className={`text-sm p-2 rounded border ${currentStep.calcDetails.canTake ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            <strong>Check:</strong> Weight ({currentStep.calcDetails.weight}) ≤ Capacity ({currentStep.calcDetails.currentCap})? 
                            <span className="ml-2 font-bold">{currentStep.calcDetails.canTake ? 'YES' : 'NO'}</span>
                          </div>
                          
                          {currentStep.calcDetails.canTake ? (
                             <div className="text-sm space-y-2 font-mono">
                               <div className="flex justify-between items-center p-2 bg-emerald-50/50 rounded border border-emerald-100">
                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Take:</span>
                                  <span>
                                    <span className="text-slate-400">val</span> {currentStep.calcDetails.value} + <span className="text-slate-400">dp[{currentStep.i-1}][{currentStep.j - currentStep.calcDetails.weight}]</span> {currentStep.calcDetails.prevDpTake} = <strong>{currentStep.calcDetails.takeVal}</strong>
                                  </span>
                               </div>
                               <div className="flex justify-between items-center p-2 bg-blue-50/50 rounded border border-blue-100">
                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Not Take:</span>
                                  <span>
                                    <span className="text-slate-400">dp[{currentStep.i-1}][{currentStep.j}]</span> = <strong>{currentStep.calcDetails.notTakeVal}</strong>
                                  </span>
                               </div>
                               <div className="flex justify-between items-center p-2 bg-yellow-50 rounded border border-yellow-200 font-bold">
                                  <span>Result:</span>
                                  <span>Max({currentStep.calcDetails.takeVal}, {currentStep.calcDetails.notTakeVal}) = {Math.max(currentStep.calcDetails.takeVal!, currentStep.calcDetails.notTakeVal!)}</span>
                               </div>
                             </div>
                          ) : (
                            <div className="text-sm font-mono p-2 bg-blue-50/50 rounded border border-blue-100">
                               <div className="flex justify-between items-center">
                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Copy Top:</span>
                                  <span>
                                    <span className="text-slate-400">dp[{currentStep.i-1}][{currentStep.j}]</span> = <strong>{currentStep.calcDetails.notTakeVal}</strong>
                                  </span>
                               </div>
                            </div>
                          )}
                       </div>
                     ) : (
                       <div className="text-sm text-slate-400 italic text-center py-4">
                         Start the simulation to see details
                       </div>
                     )}
                  </div>
                </div>

                {/* Code Block */}
                <div className="bg-slate-900 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col text-xs md:text-sm font-mono leading-relaxed">
                   <div className="p-3 bg-slate-800 border-b border-slate-700 text-slate-300 font-sans font-semibold text-xs flex justify-between">
                     <span>Algorithm</span>
                     <span>Java</span>
                   </div>
                   <div className="p-4 text-slate-300 overflow-auto flex-1">
<pre className="space-y-1">
{`int tabSolve(int W, int val[], int wt[],int n){
  int[][] dp=new int[n+1][W+1];

  for (int i=1;i<=n;i++){
    for (int j=1;j<=W;j++){`}
  <div className={`transition-colors duration-200 px-1 -mx-1 rounded ${currentStep?.codeLine === 'check-weight' ? 'bg-yellow-500/30 text-yellow-200 border-l-2 border-yellow-500' : 'opacity-50'}`}>
    {`      if(wt[i-1]<=j){`}
  </div>
  <div className={`transition-colors duration-200 px-1 -mx-1 rounded ${currentStep?.codeLine === 'calc-max' ? 'bg-yellow-500/30 text-yellow-200 border-l-2 border-yellow-500' : 'opacity-50'}`}>
    {`        int take=val[i-1] + dp[i-1][j-wt[i-1]];
        int notTake=dp[i-1][j];
        dp[i][j]=Math.max(take,notTake);`}
  </div>
  <div className={`transition-colors duration-200 px-1 -mx-1 rounded ${currentStep?.codeLine === 'calc-skip' ? 'bg-yellow-500/30 text-yellow-200 border-l-2 border-yellow-500' : 'opacity-50'}`}>
    {`      } else {
        dp[i][j]=dp[i-1][j];
      }`}
  </div>
{`    }
  }
  return 0;
}`}
</pre>
                   </div>
                </div>

              </div>
            </div>
          </div>

          {/* Bottom Control Bar */}
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

              <button onClick={handleReset} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors ml-2" title="Reset">
                <RotateCcw size={20} />
              </button>
            </div>

            <div className="flex flex-col items-end">
               <div className="text-sm font-medium text-slate-900">
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