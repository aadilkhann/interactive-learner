import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Database, ArrowDown, ChevronRight, Check, X, Layers } from 'lucide-react';

const SQLJoinAnimator = () => {
  // --- State ---
  const [joinType, setJoinType] = useState('INNER');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [animationSpeed, setAnimationSpeed] = useState(1000); // ms per step
  const [completedRows, setCompletedRows] = useState([]);
  
  // --- Data ---
  const employees = [
    { id: 1, name: 'Alice', dept_id: 101 },
    { id: 2, name: 'Bob', dept_id: 102 },
    { id: 3, name: 'Charlie', dept_id: null },
  ];

  const departments = [
    { id: 101, name: 'Product' },
    { id: 102, name: 'Sales' },
    { id: 103, name: 'Engineering' },
  ];

  // --- Animation Logic Generation ---
  
  // Helper to create a merged row object
  const createMergedRow = (emp, dept, status) => ({
    id: `${emp ? emp.id : 'null'}-${dept ? dept.id : 'null'}`,
    emp,
    dept,
    status // 'match', 'left-only', 'right-only'
  });

  // Generate the sequence of animation steps based on Join Type
  const steps = useMemo(() => {
    const sequence = [];
    
    if (joinType === 'INNER' || joinType === 'LEFT') {
      employees.forEach(emp => {
        // Step 1: Select Left Row
        sequence.push({
          type: 'select',
          leftId: emp.id,
          rightId: null,
          message: `Processing Employee: ${emp.name} (Dept ID: ${emp.dept_id || 'NULL'})`
        });

        const match = departments.find(d => d.id === emp.dept_id);

        if (match) {
          // Step 2: Found Match
          sequence.push({
            type: 'match',
            leftId: emp.id,
            rightId: match.id,
            message: `Match found! Dept ${match.id} is ${match.name}.`,
            row: createMergedRow(emp, match, 'match')
          });
          // Step 3: Merge
          sequence.push({
            type: 'merge',
            leftId: emp.id,
            rightId: match.id,
            message: `Merging ${emp.name} + ${match.name} into result.`,
            row: createMergedRow(emp, match, 'match')
          });
        } else {
          // No match found
          sequence.push({
            type: 'scan-fail',
            leftId: emp.id,
            rightId: null,
            message: `No department found for ID ${emp.dept_id || 'NULL'}.`
          });

          if (joinType === 'LEFT') {
            sequence.push({
              type: 'merge-null',
              leftId: emp.id,
              rightId: null,
              message: `LEFT JOIN preserves ${emp.name}. Filling Right side with NULL.`,
              row: createMergedRow(emp, null, 'left-only')
            });
          } else {
            sequence.push({
              type: 'discard',
              leftId: emp.id,
              rightId: null,
              message: `INNER JOIN discards ${emp.name} because there is no match.`
            });
          }
        }
      });
    } 
    else if (joinType === 'RIGHT') {
      departments.forEach(dept => {
        sequence.push({
          type: 'select',
          leftId: null,
          rightId: dept.id,
          message: `Processing Department: ${dept.name} (ID: ${dept.id})`
        });

        const matches = employees.filter(e => e.dept_id === dept.id);

        if (matches.length > 0) {
          matches.forEach(emp => {
             sequence.push({
              type: 'match',
              leftId: emp.id,
              rightId: dept.id,
              message: `Match found! Employee ${emp.name} belongs to ${dept.name}.`,
              row: createMergedRow(emp, dept, 'match')
            });
            sequence.push({
              type: 'merge',
              leftId: emp.id,
              rightId: dept.id,
              message: `Merging ${emp.name} + ${dept.name} into result.`,
              row: createMergedRow(emp, dept, 'match')
            });
          });
        } else {
          sequence.push({
            type: 'scan-fail',
            leftId: null,
            rightId: dept.id,
            message: `No employees found in ${dept.name}.`
          });
          sequence.push({
            type: 'merge-null',
            leftId: null,
            rightId: dept.id,
            message: `RIGHT JOIN preserves ${dept.name}. Filling Left side with NULL.`,
            row: createMergedRow(null, dept, 'right-only')
          });
        }
      });
    }
    else if (joinType === 'FULL') {
        // Phase 1: Left + Matches
        employees.forEach(emp => {
            sequence.push({ type: 'select', leftId: emp.id, rightId: null, message: `Checking Employee: ${emp.name}` });
            const match = departments.find(d => d.id === emp.dept_id);
            if (match) {
                 sequence.push({ type: 'merge', leftId: emp.id, rightId: match.id, message: `Match! Merging ${emp.name} + ${match.name}`, row: createMergedRow(emp, match, 'match') });
            } else {
                 sequence.push({ type: 'merge-null', leftId: emp.id, rightId: null, message: `No Match. FULL JOIN keeps ${emp.name} + NULL`, row: createMergedRow(emp, null, 'left-only') });
            }
        });
        // Phase 2: Right orphans
        departments.forEach(dept => {
            const hasMatch = employees.some(e => e.dept_id === dept.id);
            if (!hasMatch) {
                 sequence.push({ type: 'select', leftId: null, rightId: dept.id, message: `Checking orphan Department: ${dept.name}` });
                 sequence.push({ type: 'merge-null', leftId: null, rightId: dept.id, message: `No Employees. FULL JOIN keeps NULL + ${dept.name}`, row: createMergedRow(null, dept, 'right-only') });
            }
        });
    }

    return sequence;
  }, [joinType]);


  // --- Timer & Execution ---
  
  useEffect(() => {
    let timer;
    if (isPlaying && currentStepIndex < steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, animationSpeed);
    } else if (currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, steps, animationSpeed]);

  // Handle side effects of steps (adding to completed rows)
  useEffect(() => {
    if (currentStepIndex >= 0 && currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      if (step.type === 'merge' || step.type === 'merge-null') {
        // Add to completed rows immediately for this simplified viz, 
        // or we could wait a beat. Let's add it.
        setCompletedRows(prev => [...prev, step.row]);
      }
    }
  }, [currentStepIndex, steps]);

  const resetAnimation = () => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    setCompletedRows([]);
  };

  const handleJoinChange = (type) => {
    setJoinType(type);
    resetAnimation();
  };

  // --- Current State Selectors ---
  const currentStep = steps[currentStepIndex] || { type: 'idle', message: 'Ready to start.' };
  const activeLeftId = currentStep.leftId;
  const activeRightId = currentStep.rightId;

  // Render Helpers
  const renderNullCell = () => <span className="text-gray-400 italic text-xs tracking-wider">NULL</span>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800 p-4 max-w-5xl mx-auto">
      
      {/* Header */}
      <header className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
          <Layers className="w-6 h-6 text-blue-600" />
          Animated SQL Join Visualizer
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Watch how the database engine stitches tables together, row by row.
        </p>
      </header>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          {['INNER', 'LEFT', 'RIGHT', 'FULL'].map(t => (
            <button
              key={t}
              onClick={() => handleJoinChange(t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                joinType === t 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t} JOIN
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setAnimationSpeed(1500)}
              className={`px-3 py-1 text-xs rounded-md ${animationSpeed === 1500 ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-500'}`}
            >
              Slow
            </button>
            <button 
              onClick={() => setAnimationSpeed(800)}
              className={`px-3 py-1 text-xs rounded-md ${animationSpeed === 800 ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-500'}`}
            >
              Fast
            </button>
          </div>

          {!isPlaying ? (
            <button 
              onClick={() => {
                if (currentStepIndex === steps.length - 1) resetAnimation();
                setIsPlaying(true);
              }}
              className="flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold shadow-sm transition-transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              {currentStepIndex === -1 ? 'Start' : currentStepIndex === steps.length - 1 ? 'Replay' : 'Resume'}
            </button>
          ) : (
            <button 
              onClick={() => setIsPlaying(false)}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-sm"
            >
              <Pause className="w-4 h-4 fill-current" />
              Pause
            </button>
          )}

          <button 
            onClick={resetAnimation}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Animation Stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative">
        
        {/* Table 1: Employees */}
        <div className="relative">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-blue-700 text-sm uppercase tracking-wide">Left: Employees</h3>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-blue-800">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Dept_ID</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr 
                    key={emp.id}
                    className={`transition-all duration-300 border-b border-blue-50 ${
                      activeLeftId === emp.id 
                        ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset scale-[1.02] z-10 font-medium' 
                        : 'opacity-100'
                    }`}
                  >
                    <td className="p-3">{emp.id}</td>
                    <td className="p-3">{emp.name}</td>
                    <td className={`p-3 font-mono ${!emp.dept_id ? 'text-red-400' : ''}`}>
                      {emp.dept_id || 'NULL'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Departments */}
        <div className="relative">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-purple-700 text-sm uppercase tracking-wide">Right: Departments</h3>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-purple-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 text-purple-800">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Name</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr 
                    key={dept.id}
                    className={`transition-all duration-300 border-b border-purple-50 ${
                      activeRightId === dept.id 
                        ? 'bg-purple-100 ring-2 ring-purple-500 ring-inset scale-[1.02] z-10 font-medium' 
                        : 'opacity-100'
                    }`}
                  >
                    <td className="p-3 font-mono">{dept.id}</td>
                    <td className="p-3">{dept.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Processing Indicator (Center Overlay) */}
        {isPlaying && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none w-full max-w-md">
                 {/* Connection Line */}
                 <div className={`
                    bg-slate-800 text-white text-xs font-mono p-3 rounded-full shadow-2xl
                    flex items-center justify-center gap-3 transition-all duration-300 opacity-90
                    ${currentStep.type === 'match' ? 'scale-110 bg-green-600' : ''}
                    ${currentStep.type === 'scan-fail' ? 'bg-red-500' : ''}
                    ${currentStep.type === 'discard' ? 'bg-gray-400 opacity-50' : ''}
                 `}>
                    {currentStep.type === 'match' && <Check className="w-4 h-4" />}
                    {currentStep.type === 'scan-fail' && <X className="w-4 h-4" />}
                    {currentStep.type === 'select' && <Database className="w-4 h-4 animate-pulse" />}
                    
                    <span>{currentStep.message}</span>
                 </div>
            </div>
        )}
      </div>


      {/* The "Merging Zone" / Result Table */}
      <div className="flex-1 bg-white rounded-xl shadow-lg border border-slate-200 p-6 flex flex-col">
         <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-green-500" />
            Result Set
            <span className="text-xs font-normal text-slate-400 ml-2 bg-slate-100 px-2 py-1 rounded-full">
                {completedRows.length} rows generated
            </span>
         </h3>
         
         <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-slate-50 min-h-[200px] relative">
            <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-slate-200 text-slate-700 shadow-sm z-10">
                    <tr>
                        <th className="p-3 text-left w-1/6 border-r border-slate-300">Emp ID</th>
                        <th className="p-3 text-left w-1/4 border-r border-slate-300">Emp Name</th>
                        <th className="p-3 text-left w-1/6 border-r-4 border-slate-400 bg-blue-100/50">Dept ID (FK)</th>
                        <th className="p-3 text-left w-1/6 border-r border-slate-300 bg-purple-100/50">Dept ID (PK)</th>
                        <th className="p-3 text-left">Dept Name</th>
                    </tr>
                </thead>
                <tbody>
                    {completedRows.map((row, idx) => (
                        <tr 
                            key={idx} 
                            className={`
                                border-b border-slate-200 transition-all duration-500 ease-out
                                ${row.status === 'match' ? 'bg-green-50' : row.status === 'left-only' ? 'bg-blue-50' : 'bg-purple-50'}
                                animate-in fade-in slide-in-from-top-4
                            `}
                        >
                            <td className="p-3 font-mono border-r border-slate-200">
                                {row.emp ? row.emp.id : renderNullCell()}
                            </td>
                            <td className="p-3 border-r border-slate-200 font-medium">
                                {row.emp ? row.emp.name : renderNullCell()}
                            </td>
                            <td className="p-3 border-r-4 border-slate-300 font-mono text-blue-600">
                                {row.emp ? (row.emp.dept_id || renderNullCell()) : renderNullCell()}
                            </td>
                            <td className="p-3 border-r border-slate-200 font-mono text-purple-600">
                                {row.dept ? row.dept.id : renderNullCell()}
                            </td>
                            <td className="p-3">
                                {row.dept ? row.dept.name : renderNullCell()}
                            </td>
                        </tr>
                    ))}
                    {completedRows.length === 0 && (
                        <tr>
                            <td colSpan="5" className="p-12 text-center text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                    <Database className="w-8 h-8 opacity-20" />
                                    <span>Waiting for database execution...</span>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>

    </div>
  );
};

export default SQLJoinAnimator;