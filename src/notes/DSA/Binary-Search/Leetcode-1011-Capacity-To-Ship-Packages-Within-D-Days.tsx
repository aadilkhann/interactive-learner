import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  StepBack, 
  RotateCcw, 
  Settings, 
  Info, 
  Truck,
  Package,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

// --- Types ---
interface StepState {
  // Binary Search State
  low: number;
  high: number;
  mid: number;
  ans: number;

  // Simulation State (canShip)
  phase: 'search' | 'sim_start' | 'sim_load' | 'sim_overflow' | 'sim_fail' | 'sim_success' | 'complete';
  currentDay: number;
  currentLoad: number;
  processedPackages: number[]; // Indices of packages processed so far in current simulation
  dayLoads: number[][]; // Array of arrays, e.g., [[1,2,3], [4,5]] showing packages per day
  errorMsg?: string;

  // Meta
  explanation: string;
  codeLine: string;
}

// --- Constants ---
const MAX_ARR_SIZE = 15;
const MAX_VAL = 50;

export default function ShipmentVisualizer() {
  // --- Inputs ---
  const [weights, setWeights] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [days, setDays] = useState<number>(5);

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
  }, [weights, days]);

  const generateSteps = () => {
    const newSteps: StepState[] = [];
    
    // Initial State corresponding to Java code logic
    let low = Math.min(...weights); 
    let high = weights.reduce((a, b) => a + b, 0);
    let ans = 0;

    newSteps.push({
      low, high, mid: 0, ans: 0,
      phase: 'search',
      currentDay: 0, currentLoad: 0, processedPackages: [], dayLoads: [],
      explanation: `Initialize Binary Search. Low (min element) = ${low}, High (sum) = ${high}.`,
      codeLine: 'init'
    });

    while (low <= high) {
      const mid = Math.floor(low + (high - low) / 2);

      // 1. Calculate Mid
      newSteps.push({
        low, high, mid, ans,
        phase: 'sim_start',
        currentDay: 1, currentLoad: 0, processedPackages: [], dayLoads: [[]],
        explanation: `Test Capacity: ${mid}. Can we ship within ${days} days?`,
        codeLine: 'calc-mid'
      });

      // 2. Simulate canShip(weights, mid, days)
      let currWeight = 0;
      let day = 1;
      let possible = true;
      const allDayLoads: number[][] = [[]]; // Tracking visuals

      for (let i = 0; i < weights.length; i++) {
        const wt = weights[i];

        // Visual step: considering package
        newSteps.push({
          low, high, mid, ans,
          phase: 'sim_load',
          currentDay: day, currentLoad: currWeight, 
          processedPackages: Array.from({length: i}, (_, k) => k), // 0 to i-1
          dayLoads: JSON.parse(JSON.stringify(allDayLoads)),
          explanation: `Checking package weight ${wt}. Current load: ${currWeight}/${mid}.`,
          codeLine: 'sim-check'
        });

        if (currWeight + wt <= mid) {
          currWeight += wt;
          allDayLoads[day - 1].push(wt);
          
          newSteps.push({
            low, high, mid, ans,
            phase: 'sim_load',
            currentDay: day, currentLoad: currWeight, 
            processedPackages: Array.from({length: i+1}, (_, k) => k),
            dayLoads: JSON.parse(JSON.stringify(allDayLoads)),
            explanation: `Added ${wt}. Load is now ${currWeight}.`,
            codeLine: 'sim-add'
          });
        } else {
          // New Day Logic
          day++;
          currWeight = wt;
          
          // Visual: Day Increment
          allDayLoads.push([wt]); // Start new day bin
          
          newSteps.push({
            low, high, mid, ans,
            phase: 'sim_overflow',
            currentDay: day, currentLoad: currWeight, 
            processedPackages: Array.from({length: i+1}, (_, k) => k),
            dayLoads: JSON.parse(JSON.stringify(allDayLoads)),
            explanation: `Capacity exceeded! Starting Day ${day} with package ${wt}.`,
            codeLine: 'sim-new-day'
          });
        }

        // Logic from user code: if(currWeight > weight) return false;
        if (currWeight > mid) {
          possible = false;
          newSteps.push({
            low, high, mid, ans,
            phase: 'sim_fail',
            currentDay: day, currentLoad: currWeight, 
            processedPackages: Array.from({length: i+1}, (_, k) => k),
            dayLoads: JSON.parse(JSON.stringify(allDayLoads)),
            errorMsg: `Package ${wt} is heavier than capacity ${mid}!`,
            explanation: `Impossible. Single package ${wt} > Capacity ${mid}.`,
            codeLine: 'sim-fail-weight'
          });
          break; 
        }
      }

      // Check days count
      if (possible) {
        if (day <= days) {
            // Success
            ans = mid;
            newSteps.push({
                low, high, mid, ans,
                phase: 'sim_success',
                currentDay: day, currentLoad: currWeight,
                processedPackages: weights.map((_, idx) => idx),
                dayLoads: JSON.parse(JSON.stringify(allDayLoads)),
                explanation: `Success! Used ${day} days (<= ${days}). Capacity ${mid} is valid. Try smaller?`,
                codeLine: 'check-success'
            });
            high = mid - 1;
        } else {
            // Fail days
            newSteps.push({
                low, high, mid, ans,
                phase: 'sim_fail',
                currentDay: day, currentLoad: currWeight,
                processedPackages: weights.map((_, idx) => idx),
                dayLoads: JSON.parse(JSON.stringify(allDayLoads)),
                errorMsg: `Took ${day} days! Limit is ${days}.`,
                explanation: `Too many days (${day} > ${days}). Need larger capacity.`,
                codeLine: 'check-fail-days'
            });
            low = mid + 1;
        }
      } else {
          // Failed due to weight logic earlier
          low = mid + 1;
      }
    }

    // Completion
    newSteps.push({
      low, high, mid: -1, ans,
      phase: 'complete',
      currentDay: 0, currentLoad: 0, processedPackages: [], dayLoads: [],
      explanation: `Binary Search Complete. Minimum Capacity: ${ans}.`,
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

  // --- Input Handling ---
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^[\d, ]*$/.test(val)) {
      const parts = val.split(',').map(s => s.trim()).filter(s => s !== '').map(Number);
      if (parts.length <= MAX_ARR_SIZE && parts.every(n => n <= MAX_VAL)) {
        setWeights(parts);
      }
    }
  };

  // --- Render Helpers ---
  const currentStep = steps[currentStepIndex];

  if (!currentStep) return <div className="p-8 text-center text-slate-500">Initializing...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Truck className="text-blue-600" size={24} />
          <h1 className="font-bold text-lg">Capacity To Ship Packages <span className="text-slate-400 font-normal text-sm ml-2">Binary Search on Answer</span></h1>
        </div>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isConfigOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Settings size={16} />
          Config
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Config Panel */}
        <div className={`${isConfigOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden flex flex-col shrink-0`}>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Weights (comma separated)</label>
              <input 
                type="text" 
                value={weights.join(', ')}
                onChange={handleWeightChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="1, 2, 3, 4, 5..."
              />
              <p className="text-xs text-slate-400 mt-1">Max {MAX_ARR_SIZE} items.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Days Limit (D)</label>
              <input 
                type="number" 
                value={days}
                onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
               <label className="block text-sm font-semibold text-slate-700 mb-2">Animation Speed</label>
              <input 
                type="range" 
                min="200" 
                max="2000" 
                step="100"
                value={2200 - playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(2200 - parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800">
              <p className="font-semibold mb-1 flex items-center gap-1"><Info size={12}/> Problem</p>
              Find the <strong>minimum capacity</strong> of the ship so that all packages can be shipped within <strong>{days}</strong> days.
              <br/><br/>
              Order of packages cannot be changed.
            </div>
          </div>
        </div>

        {/* Center Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex flex-col gap-6">
              
              {/* 1. Binary Search Dashboard */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
                 <div className="w-full flex justify-between items-center mb-6">
                    <span className="text-sm font-semibold text-slate-500">Binary Search Range</span>
                    <div className="flex gap-4 text-sm font-mono">
                        <span className="text-slate-400">Low: <strong className="text-slate-700">{currentStep.low}</strong></span>
                        <span className="text-slate-400">High: <strong className="text-slate-700">{currentStep.high}</strong></span>
                        <span className="text-slate-400">Ans: <strong className="text-emerald-600">{currentStep.ans}</strong></span>
                    </div>
                 </div>
                 
                 {/* Range Visualization */}
                 <div className="w-full h-12 relative flex items-center">
                    {/* Background Line */}
                    <div className="absolute w-full h-2 bg-slate-100 rounded-full"></div>
                    
                    {/* Active Range */}
                    <div 
                      className="absolute h-2 bg-blue-200 rounded-full transition-all duration-300"
                      style={{
                        left: `${( (currentStep.low - Math.min(...weights)) / (weights.reduce((a,b)=>a+b,0) - Math.min(...weights)) ) * 100}%`,
                        width: `${( (currentStep.high - currentStep.low) / (weights.reduce((a,b)=>a+b,0) - Math.min(...weights)) ) * 100}%`
                      }}
                    ></div>

                    {/* Low Marker */}
                    <div 
                        className="absolute h-6 w-1 bg-slate-400 top-3"
                        style={{ left: `${( (currentStep.low - Math.min(...weights)) / (weights.reduce((a,b)=>a+b,0) - Math.min(...weights)) ) * 100}%` }}
                    ></div>

                    {/* High Marker */}
                    <div 
                        className="absolute h-6 w-1 bg-slate-400 top-3"
                        style={{ left: `${( (currentStep.high - Math.min(...weights)) / (weights.reduce((a,b)=>a+b,0) - Math.min(...weights)) ) * 100}%` }}
                    ></div>

                    {/* Mid Marker */}
                    {currentStep.phase !== 'complete' && currentStep.mid > 0 && (
                        <div 
                            className="absolute top-0 bottom-0 flex flex-col items-center transition-all duration-300 z-10"
                            style={{ left: `${( (currentStep.mid - Math.min(...weights)) / (weights.reduce((a,b)=>a+b,0) - Math.min(...weights)) ) * 100}%` }}
                        >
                            <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold shadow-md transform -translate-y-full mb-1">
                                {currentStep.mid}
                            </div>
                            <div className="w-0.5 h-full bg-blue-600 border-l border-dashed border-blue-600"></div>
                        </div>
                    )}
                 </div>
              </div>

              {/* 2. Simulation & Code Row */}
              <div className="flex flex-col xl:flex-row gap-6 min-h-[400px]">
                
                {/* Simulation Area */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                            Shipping Simulation (Capacity: {currentStep.mid})
                        </h2>
                        <div className="text-sm">
                            Days Used: <span className={`font-bold ${currentStep.dayLoads.length > days ? 'text-rose-600' : 'text-slate-700'}`}>{currentStep.dayLoads.length}</span> / {days}
                        </div>
                    </div>

                    <div className="flex-1 p-6 bg-slate-50/50 flex flex-col gap-6 overflow-y-auto max-h-[500px]">
                        
                        {/* Status Message */}
                        {currentStep.phase === 'sim_fail' && (
                            <div className="bg-rose-100 border border-rose-200 text-rose-800 p-3 rounded-lg flex items-center gap-2 justify-center animate-in zoom-in-95">
                                <AlertCircle size={20}/> {currentStep.errorMsg || 'Simulation Failed'}
                            </div>
                        )}
                        {currentStep.phase === 'sim_success' && (
                            <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-center gap-2 justify-center animate-in zoom-in-95">
                                <CheckCircle2 size={20}/> Capacity Valid!
                            </div>
                        )}

                        {/* Loading Dock / Days */}
                        <div className="flex flex-wrap gap-4 items-start content-start">
                            {/* Render existing days */}
                            {currentStep.dayLoads.map((dayPackets, dIdx) => (
                                <div key={dIdx} className="flex flex-col gap-2">
                                    <div className="text-xs font-bold text-slate-400 text-center uppercase">Day {dIdx + 1}</div>
                                    <div 
                                        className={`w-32 border-2 border-dashed rounded-xl p-2 min-h-[120px] flex flex-col-reverse gap-1 transition-colors duration-300
                                            ${dIdx + 1 > days ? 'border-rose-300 bg-rose-50' : 'border-slate-300 bg-white'}
                                        `}
                                    >
                                        {/* Packets in this day */}
                                        {dayPackets.map((pVal, pIdx) => (
                                            <div 
                                                key={pIdx} 
                                                className={`h-8 w-full rounded flex items-center justify-center text-sm font-bold text-white shadow-sm transition-all animate-in slide-in-from-top-2
                                                    ${pVal > currentStep.mid ? 'bg-rose-500' : 'bg-indigo-500'}
                                                `}
                                                style={{ opacity: 0.9 }}
                                            >
                                                <Package size={14} className="mr-1 opacity-50"/> {pVal}
                                            </div>
                                        ))}
                                        
                                        {/* Capacity Indicator */}
                                        <div className="mt-auto pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400 font-mono">
                                            <span>Sum: {dayPackets.reduce((a,b)=>a+b,0)}</span>
                                            <span>Max: {currentStep.mid}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Remaining Packages Queue */}
                            <div className="ml-auto p-4 border-l border-slate-200 flex flex-col items-center gap-2">
                                <div className="text-xs font-bold text-slate-400 uppercase">Queue</div>
                                {weights.map((w, idx) => {
                                    if (currentStep.processedPackages.includes(idx) && !(currentStep.phase === 'sim_load' && idx === currentStep.processedPackages[currentStep.processedPackages.length-1])) return null; // Hide processed
                                    
                                    const isNext = idx === currentStep.processedPackages.length; // Approximate logic for "next"
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`w-10 h-10 rounded flex items-center justify-center font-bold text-sm border-2 transition-all
                                                ${isNext ? 'bg-white border-blue-500 text-blue-600 scale-110 shadow-md' : 'bg-slate-100 border-slate-200 text-slate-400 scale-90'}
                                            `}
                                        >
                                            {w}
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
{`public int shipWithinDays(int[] weights, int days) {
  int low = min(weights), high = sum(weights);`}
  <div className={currentStep.codeLine === 'init' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`  int ans = 0;`}
  </div>
{`  
  while(low <= high) {
    int mid = low + (high - low) / 2;`}
  
  <div className={currentStep.codeLine === 'calc-mid' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`    if(canShip(weights, mid, days)) {`}
  </div>
  
  <div className={currentStep.codeLine === 'check-success' ? 'bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500' : ''}>
{`      ans = mid;
      high = mid - 1;`}
  </div>
  
  <div className={currentStep.codeLine === 'check-fail-days' ? 'bg-rose-500/30 text-rose-200 -mx-4 px-4 border-l-2 border-rose-500' : ''}>
{`    } else {
      low = mid + 1;
    }`}
  </div>
{`  }
  return ans;
}

boolean canShip(int[] wts, int cap, int days) {
  int load = 0, day = 1;
  for(int wt : wts) {`}
  <div className={currentStep.codeLine === 'sim-check' ? 'bg-blue-500/30 text-blue-200 -mx-4 px-4 border-l-2 border-blue-500' : ''}>
{`    if(load + wt <= cap) {
      load += wt;`}
  </div>
  <div className={currentStep.codeLine === 'sim-add' ? 'bg-emerald-500/30 text-emerald-200 -mx-4 px-4 border-l-2 border-emerald-500' : ''}>
{`    } else {
      day++; load = wt;`}
  </div>
  <div className={currentStep.codeLine === 'sim-new-day' ? 'bg-amber-500/30 text-amber-200 -mx-4 px-4 border-l-2 border-amber-500' : ''}>
{`    }
    if(load > cap) return false;`}
  </div>
  <div className={currentStep.codeLine === 'sim-fail-weight' ? 'bg-rose-500/30 text-rose-200 -mx-4 px-4 border-l-2 border-rose-500' : ''}>
{`  }
  return day <= days;
}`}
  </div>
</pre>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Footer Controls */}
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
               <div className="text-sm font-medium text-slate-900 animate-pulse-once">
                 {currentStep.explanation}
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