import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  StepBack, 
  RotateCcw, 
  Settings, 
  Coins, 
  Info,
  X,
  Grid,
  List
} from 'lucide-react';

// --- Types ---
interface StepState {
  i: number; // Current Coin Index
  a: number; // Current Amount Index
  dp: number[][]; // Snapshot of the DP table (1 row for 1D, N rows for 2D)
  phase: 'init' | 'check' | 'update';
  explanation: string;
  highlightRefs: { r: number; c: number; type: 'take' | 'not-take' | 'current' }[];
  codeLine: string;
  calcDetails?: {
    coinVal: number;
    currentAmt: number;
    notTakeVal: number;
    takeVal: number;
    canTake: boolean;
    result: number;
  };
}

// --- Constants ---
const INF = 1000000000;
const MAX_AMOUNT_LIMIT = 15;
const MAX_COINS_LIMIT = 6;
const CELL_SIZE = 44; 
const GAP_SIZE = 4;
const STRIDE = CELL_SIZE + GAP_SIZE;

export default function CoinChangeVisualizer() {
  // --- State ---
  // Input
  const [amount, setAmount] = useState<number>(11);
  const [coins, setCoins] = useState<number[]>([1, 2, 5]);
  const [mode, setMode] = useState<'2D' | '1D'>('2D');
  
  // UI
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Simulation
  const [steps, setSteps] = useState<StepState[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Logic ---
  useEffect(() => {
    const n = coins.length;
    const W = amount;
    const newSteps: StepState[] = [];
    
    if (mode === '2D') {
      // --- 2D DP Logic ---
      const dp: number[][] = Array(n).fill(0).map(() => Array(W + 1).fill(0));

      // Step 0: Start
      newSteps.push({
        i: -1,
        a: -1,
        dp: JSON.parse(JSON.stringify(dp)),
        phase: 'init',
        explanation: 'Initialize 2D DP table. Rows = Coins, Cols = Amount 0 to ' + W,
        highlightRefs: [],
        codeLine: 'init-table'
      });

      // Base Case: First Coin
      for (let a = 0; a <= W; a++) {
        const coin = coins[0];
        const isDivisible = a % coin === 0;
        const val = isDivisible ? Math.floor(a / coin) : INF;
        
        dp[0][a] = val;

        newSteps.push({
          i: 0,
          a: a,
          dp: JSON.parse(JSON.stringify(dp)),
          phase: 'init',
          explanation: `Base Case (Coin ${coin}): Is amount ${a} divisible by ${coin}? ${isDivisible ? `Yes -> ${a}/${coin} = ${val}` : 'No -> INF'}`,
          highlightRefs: [{ r: 0, c: a, type: 'current' }],
          codeLine: isDivisible ? 'init-divisible' : 'init-inf',
          calcDetails: {
            coinVal: coin,
            currentAmt: a,
            notTakeVal: 0,
            takeVal: 0,
            canTake: isDivisible,
            result: val
          }
        });
      }

      // Main Loop
      for (let i = 1; i < n; i++) {
        for (let a = 0; a <= W; a++) {
          const coin = coins[i];
          
          const refs: { r: number; c: number; type: 'take' | 'not-take' | 'current' }[] = [
            { r: i, c: a, type: 'current' },
            { r: i - 1, c: a, type: 'not-take' }
          ];

          const notTake = dp[i - 1][a];
          let take = INF;
          let canTake = false;

          if (coin <= a) {
            take = 1 + dp[i][a - coin];
            refs.push({ r: i, c: a - coin, type: 'take' });
            canTake = true;
          }

          const result = Math.min(take, notTake);
          dp[i][a] = result;

          newSteps.push({
            i: i,
            a: a,
            dp: JSON.parse(JSON.stringify(dp)),
            phase: 'update',
            explanation: `Coin ${coin}, Amt ${a}: Min(NotTake[${notTake === INF ? 'INF' : notTake}], Take[${canTake ? (take >= INF ? 'INF' : take) : '-'}])`,
            highlightRefs: refs,
            codeLine: 'update-min',
            calcDetails: {
              coinVal: coin,
              currentAmt: a,
              notTakeVal: notTake,
              takeVal: take,
              canTake: canTake,
              result: result
            }
          });
        }
      }

      // Final Result
      const finalAns = dp[n - 1][W];
      newSteps.push({
        i: n - 1,
        a: W,
        dp: JSON.parse(JSON.stringify(dp)),
        phase: 'update',
        explanation: `Calculation Complete. Min coins for amount ${W} is ${finalAns >= INF ? -1 : finalAns}.`,
        highlightRefs: [{ r: n - 1, c: W, type: 'current' }],
        codeLine: 'return',
        calcDetails: undefined
      });

    } else {
      // --- 1D DP Logic ---
      const dpRow: number[] = new Array(W + 1).fill(INF);
      dpRow[0] = 0;

      // Wrap in 2D array structure for compatibility with rendering logic
      // We will only use row 0
      const getSnapshot = (row: number[]) => [ [...row] ];

      newSteps.push({
        i: -1,
        a: -1,
        dp: getSnapshot(dpRow),
        phase: 'init',
        explanation: 'Initialize 1D DP array with INF, except dp[0] = 0.',
        highlightRefs: [{ r: 0, c: 0, type: 'current' }],
        codeLine: 'init-1d'
      });

      for (let i = 0; i < n; i++) {
        const coin = coins[i];
        
        for (let a = coin; a <= W; a++) {
          const refs: { r: number; c: number; type: 'take' | 'not-take' | 'current' }[] = [
            { r: 0, c: a, type: 'current' }
          ];

          const notTake = dpRow[a]; // Existing value at current index
          const takeIdx = a - coin;
          const takeVal = 1 + dpRow[takeIdx];
          
          refs.push({ r: 0, c: takeIdx, type: 'take' });

          const newVal = Math.min(notTake, takeVal);
          dpRow[a] = newVal;

          newSteps.push({
            i: i, // We use 'i' to track which coin loop we are in
            a: a,
            dp: getSnapshot(dpRow),
            phase: 'update',
            explanation: `Coin ${coin}: dp[${a}] = Min(Old[${notTake >= INF ? 'INF' : notTake}], 1 + dp[${a}-${coin}] [${takeVal >= INF ? 'INF' : takeVal}])`,
            highlightRefs: refs,
            codeLine: 'update-1d',
            calcDetails: {
              coinVal: coin,
              currentAmt: a,
              notTakeVal: notTake,
              takeVal: takeVal,
              canTake: true, // In 1D loop structure, we start from a=coin, so always true
              result: newVal
            }
          });
        }
      }
      
      const finalAns = dpRow[W];
      newSteps.push({
        i: n - 1,
        a: W,
        dp: getSnapshot(dpRow),
        phase: 'update',
        explanation: `Result: dp[${W}] = ${finalAns >= INF ? -1 : finalAns}`,
        highlightRefs: [{ r: 0, c: W, type: 'current' }],
        codeLine: 'return',
        calcDetails: undefined
      });
    }

    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [amount, coins, mode]);

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
  const addCoin = () => {
    if (coins.length >= MAX_COINS_LIMIT) return;
    setCoins([...coins, 1]);
    handleReset();
  };

  const removeCoin = (idx: number) => {
    if (coins.length <= 1) return;
    const newCoins = [...coins];
    newCoins.splice(idx, 1);
    setCoins(newCoins);
    handleReset();
  };

  const updateCoin = (idx: number, val: string) => {
    const num = parseInt(val) || 0;
    const newCoins = [...coins];
    newCoins[idx] = num;
    setCoins(newCoins);
    handleReset();
  };

  const updateAmount = (val: string) => {
    let num = parseInt(val) || 0;
    if (num > MAX_AMOUNT_LIMIT) num = MAX_AMOUNT_LIMIT;
    setAmount(num);
    handleReset();
  };

  // --- Render Helpers ---
  const currentStep = steps[currentStepIndex];

  const renderArrows = () => {
    if (!currentStep || currentStep.phase === 'init') return null;
    
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

          let isWinner = false;
          let isLoser = false;
          
          if (currentStep.calcDetails) {
            const { takeVal, notTakeVal } = currentStep.calcDetails;
            if (src.type === 'not-take') {
              if (notTakeVal <= takeVal) isWinner = true;
              else isLoser = true;
            } else if (src.type === 'take') {
              if (takeVal < notTakeVal) isWinner = true;
              else isLoser = true;
            }
          }

          // Shorten line
          const dx = x2 - x1;
          const dy = y2 - y1;
          const angle = Math.atan2(dy, dx);
          const shorten = 18; 
          const x2s = x2 - shorten * Math.cos(angle);
          const y2s = y2 - shorten * Math.sin(angle);
          const x1s = x1 + shorten * Math.cos(angle);

          const color = src.type === 'take' ? '#059669' : '#2563eb';
          const marker = src.type === 'take' ? 'url(#arrow-emerald)' : 'url(#arrow-blue)';

          // For 1D: If Y is same, arc the arrow slightly? 
          // Actually straight line is fine if it doesn't overlap too much.
          // Since 1D 'take' is always from left to right, straight is okay.
          
          return (
            <g key={i} className="transition-all duration-300">
              <line 
                x1={x1s} y1={y1} x2={x2s} y2={y2s}
                stroke={color} 
                strokeWidth={isWinner ? 2.5 : 1.5}
                strokeDasharray={isLoser ? "4,4" : "none"}
                opacity={isLoser ? 0.3 : 1}
                markerEnd={marker} 
              />
            </g>
          );
        })}
      </svg>
    );
  };

  const getCellClass = (r: number, c: number) => {
    if (!currentStep) return { className: '', style: {} };
    
    // Check if this cell is highlighted
    const ref = currentStep.highlightRefs.find(h => h.r === r && h.c === c);
    
    let base = `flex items-center justify-center border text-sm transition-colors duration-200 relative z-0 rounded-md `;
    const sizeStyle = { width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` };
    
    // Headers
    if (r === -1 || c === -1) {
      return { className: base + "bg-slate-50 text-slate-400 font-bold border-transparent", style: sizeStyle };
    }

    base += "border-slate-200 ";

    // Logic for Visited Cells
    let isVisited = false;
    if (mode === '2D') {
      isVisited = r < currentStep.i || (r === currentStep.i && c <= currentStep.a) || (currentStep.phase === 'init' && r === 0 && c <= currentStep.a);
    } else {
      // For 1D, the cell is conceptually "visited" if it has a non-INF value or is currently being processed
      // But purely visually, it's just one row. 
      isVisited = true; // Always show white background for active row
    }

    if (ref) {
        if (ref.type === 'current') return { className: base + "bg-yellow-200 border-yellow-500 font-bold text-yellow-900 ring-2 ring-yellow-400 ring-inset z-10", style: sizeStyle };
        if (ref.type === 'not-take') return { className: base + "bg-blue-100 border-blue-400 text-blue-800 z-10 shadow-sm", style: sizeStyle };
        if (ref.type === 'take') return { className: base + "bg-emerald-100 border-emerald-400 text-emerald-800 z-10 shadow-sm", style: sizeStyle };
    }

    if (isVisited) {
        return { className: base + "bg-white text-slate-700 font-medium", style: sizeStyle };
    }

    return { className: base + "bg-slate-50 text-slate-300", style: sizeStyle };
  };

  const formatVal = (val: number) => val >= INF ? '∞' : val;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <Coins className="text-yellow-500" size={20} />
          <h1 className="font-bold text-lg">Coin Change <span className="text-slate-400 font-normal text-sm ml-2">{mode === '2D' ? '2D Tabulation' : '1D Space Optimized'}</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
            <button 
              onClick={() => { setMode('2D'); handleReset(); }}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === '2D' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Grid size={14}/> 2D Grid
            </button>
            <button 
              onClick={() => { setMode('1D'); handleReset(); }}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === '1D' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List size={14}/> 1D Array
            </button>
          </div>
          <button 
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Settings size={16} />
            Configs
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Configuration Panel */}
        <div className={`${isConfigOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col shrink-0`}>
          <div className="p-6 space-y-6 overflow-y-auto">
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Target Amount</label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => updateAmount(e.target.value)}
                min="1"
                max={MAX_AMOUNT_LIMIT}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">Limited to {MAX_AMOUNT_LIMIT} for visibility.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Coins</label>
                <button 
                  onClick={addCoin}
                  disabled={coins.length >= MAX_COINS_LIMIT}
                  className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {coins.map((coin, idx) => {
                  // Highlight active coin in 1D mode
                  const isActive = mode === '1D' && currentStep?.i === idx && currentStep.phase === 'update';
                  return (
                    <div key={idx} className={`flex gap-2 items-center transition-all duration-300 p-1 rounded ${isActive ? 'bg-yellow-100 ring-2 ring-yellow-400 ring-inset' : ''}`}>
                      <span className="text-xs text-slate-400 w-4 font-mono">{idx}</span>
                      <input 
                        type="number"
                        min="1"
                        value={coin}
                        onChange={(e) => updateCoin(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm focus:border-blue-500"
                      />
                      <button 
                        onClick={() => removeCoin(idx)}
                        disabled={coins.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
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

            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
              <p className="font-semibold mb-1 flex items-center gap-1"><Info size={12}/> Logic Note</p>
              {mode === '2D' 
                ? 'Standard Tabulation: Each row represents a coin. We look UP for "Not Take" and LEFT for "Take".' 
                : 'Space Optimized: A single array updates in-place. We iterate through each coin, updating amounts from coin_val to Target.'
              }
            </div>
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex flex-col xl:flex-row gap-6 h-full">
              
              {/* DP Table */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-w-[300px] overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-700">{mode === '2D' ? 'DP Table' : 'DP Array'}</h2>
                  <div className="flex gap-2 text-xs font-medium">
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200">{mode === '2D' ? 'Not Take (Top)' : 'Old Value'}</span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded border border-emerald-200">{mode === '2D' ? 'Take (Left)' : 'Take (Look Back)'}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
                  <div className="inline-block relative">
                    {/* Header Row (Amounts) */}
                    <div className="flex ml-14 mb-2" style={{ gap: `${GAP_SIZE}px` }}>
                      {Array.from({ length: amount + 1 }).map((_, a) => (
                        <div key={a} style={{ width: `${CELL_SIZE}px` }} className="text-center text-xs text-slate-400 font-mono">
                          {a}
                        </div>
                      ))}
                    </div>

                    <div className="flex">
                      {/* Left Column (Coins or Spacer) */}
                      <div className="flex flex-col mr-2" style={{ gap: `${GAP_SIZE}px` }}>
                        {mode === '2D' ? coins.map((coin, idx) => (
                          <div key={idx} style={{ height: `${CELL_SIZE}px` }} className="flex items-center justify-end text-xs font-bold text-slate-500 pr-2 whitespace-nowrap">
                            Coin {idx} <span className="ml-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">{coin}</span>
                          </div>
                        )) : (
                          // 1D Mode: Just one label
                          <div style={{ height: `${CELL_SIZE}px` }} className="flex items-center justify-end text-xs font-bold text-slate-500 pr-2 whitespace-nowrap">
                            dp[]
                          </div>
                        )}
                      </div>

                      {/* Grid */}
                      <div className="relative">
                        {renderArrows()}
                        <div className="flex flex-col" style={{ gap: `${GAP_SIZE}px` }}>
                          {currentStep?.dp?.map((row, r) => (
                            <div key={r} className="flex" style={{ gap: `${GAP_SIZE}px` }}>
                              {currentStep?.dp[r].map((val, c) => {
                                const { className, style } = getCellClass(r, c);
                                return (
                                  <div key={c} className={className} style={style}>
                                    {formatVal(val)}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Logic */}
              <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0">
                
                {/* Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 text-sm">
                    Current Step
                  </div>
                  <div className="p-4 space-y-4">
                     {currentStep?.calcDetails ? (
                       <div className="space-y-3">
                         <div className="grid grid-cols-2 gap-3 text-sm">
                           <div className="bg-slate-50 p-2 rounded border border-slate-100">
                             <span className="block text-xs text-slate-400 uppercase">Amount</span>
                             <span className="font-bold font-mono text-lg">{currentStep.calcDetails.currentAmt}</span>
                           </div>
                           <div className="bg-slate-50 p-2 rounded border border-slate-100">
                             <span className="block text-xs text-slate-400 uppercase">Coin Value</span>
                             <span className="font-bold font-mono text-lg text-yellow-600">{currentStep.calcDetails.coinVal}</span>
                           </div>
                         </div>

                         {currentStep.phase === 'init' ? (
                           <div className="text-sm p-3 bg-slate-50 rounded border border-slate-200">
                             {currentStep.explanation}
                           </div>
                         ) : (
                           <>
                            <div className="space-y-2 text-sm font-mono">
                              {/* Take Calculation */}
                              <div className={`p-2 rounded border flex justify-between items-center ${currentStep.calcDetails.canTake ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                <span className="text-emerald-800 font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Take</span>
                                <span className="text-slate-600">
                                  {currentStep.calcDetails.canTake 
                                    ? `1 + dp[${mode === '2D' ? currentStep.i : (currentStep.calcDetails.currentAmt - currentStep.calcDetails.coinVal)}]` 
                                    : 'Coin > Amount '}
                                  {mode === '2D' ? `[${currentStep.calcDetails.currentAmt - currentStep.calcDetails.coinVal}]` : ''} = 
                                  <strong className="text-emerald-700 text-lg ml-1">
                                    {currentStep.calcDetails.canTake ? formatVal(currentStep.calcDetails.takeVal) : 'X'}
                                  </strong>
                                </span>
                              </div>

                              {/* Not Take Calculation */}
                              <div className="p-2 rounded border bg-blue-50 border-blue-200 flex justify-between items-center">
                                <span className="text-blue-800 font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {mode === '2D' ? 'Not Take' : 'Old Val'}</span>
                                <span className="text-slate-600">
                                  {mode === '2D' ? `dp[${currentStep.i - 1}][${currentStep.a}]` : `dp[${currentStep.a}]`} = <strong className="text-blue-700 text-lg">{formatVal(currentStep.calcDetails.notTakeVal)}</strong>
                                </span>
                              </div>
                            </div>
                            
                            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-center text-yellow-900 font-bold text-sm">
                               Min({formatVal(currentStep.calcDetails.takeVal)}, {formatVal(currentStep.calcDetails.notTakeVal)}) = {formatVal(currentStep.calcDetails.result)}
                            </div>
                           </>
                         )}
                       </div>
                     ) : (
                       <div className="text-center text-slate-400 italic py-4">Start simulation</div>
                     )}
                  </div>
                </div>

                {/* Code Block */}
                <div className="bg-slate-900 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col text-xs font-mono">
                   <div className="p-3 bg-slate-800 border-b border-slate-700 text-slate-300 font-sans font-semibold text-xs">
                     Java Solution ({mode})
                   </div>
                   <div className="p-4 text-slate-300 overflow-auto flex-1 leading-loose">
<pre>
{mode === '2D' ? `int n = coins.length;
int[][] dp = new int[n][amount + 1];

for (int a = 0; a <= amount; a++) {
  if (a % coins[0] == 0) dp[0][a] = a/coins[0];
  else dp[0][a] = 1e9;
}

for (int i = 1; i < n; i++) {
    for (int a = 0; a <= amount; a++) {
        int notTake = dp[i - 1][a];
        int take = 1e9;
        if (coins[i] <= a)
            take = 1 + dp[i][a - coins[i]];
        dp[i][a] = Math.min(take, notTake);
    }
}
return dp[n - 1][amount]...` : 
`int[] dp = new int[amount + 1];
Arrays.fill(dp, (int) 1e9);
dp[0] = 0;

for (int coin : coins) {
    for (int a = coin; a <= amount; a++) {
        dp[a] = Math.min(dp[a], 1 + dp[a - coin]);
    }
}

return dp[amount] == 1e9 ? -1 : dp[amount];`}
</pre>
                   </div>
                </div>

              </div>
            </div>
          </div>

          {/* Controls */}
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

            <div className="flex flex-col items-end max-w-lg text-right">
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