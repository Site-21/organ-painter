import { useState, useRef, useEffect } from 'react';

const SLOT_TYPES = {
  CAVITY: { name: 'CAVITY', color: '#ffffff', texture: null },
  SKIN: { name: 'SKIN', color: '#e8e4d9' },
  MUSCLE: { name: 'MUSCLE', color: '#8b3a3a' },
  FAT: { name: 'FAT', color: '#f4d03f' },
  MEMBRANE: { name: 'MEMBRANE', color: '#9b7653' },
  BONE: { name: 'BONE', color: '#f5f5dc' },
  BRAIN_TISSUE: { name: 'BRAIN_TISSUE', color: '#d946b5' },
  ORGAN: { name: 'ORGAN', color: '#8b4513' }
};

export default function App() {
  const [width, setWidth] = useState(16);
  const [height, setHeight] = useState(16);
  const [layerName, setLayerName] = useState('custom_layer');
  const [grid, setGrid] = useState([]);
  const [selectedType, setSelectedType] = useState('SKIN');
  const [isDrawing, setIsDrawing] = useState(false);
  const [cellSize, setCellSize] = useState(30);
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    initGrid(width, height);
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [grid, cellSize, showGrid]);

  const initGrid = (w, h) => {
    const newGrid = Array(h).fill(null).map(() => Array(w).fill(null));
    setGrid(newGrid);
  };

  const handleResize = () => {
    const newGrid = Array(height).fill(null).map((_, y) =>
      Array(width).fill(null).map((_, x) =>
        grid[y] && grid[y][x] ? grid[y][x] : null
      )
    );
    setGrid(newGrid);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;

    const ctx = canvas.getContext('2d');
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cellType = grid[y]?.[x];
        if (cellType) {
          ctx.fillStyle = SLOT_TYPES[cellType].color;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    // Draw grid lines
    if (showGrid) {
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(canvas.width, y * cellSize);
        ctx.stroke();
      }
    }
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      const newGrid = grid.map(row => [...row]);
      newGrid[y][x] = selectedType === 'ERASER' ? null : selectedType;
      setGrid(newGrid);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    handleCanvasClick(e);
  };

  const exportLayer = () => {
    const slotPoints = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x]) {
          slotPoints.push({ x, y, type: grid[y][x] });
        }
      }
    }

    const javaCode = `// Generated Layer Data
List.of(
${slotPoints.map(p => `    new SlotPoint(${p.x}, ${p.y}, SlotType.${p.type})`).join(',\n')}
)

// Shape
List.of(
${slotPoints.map(p => `    new Point(${p.x}, ${p.y})`).join(',\n')}
)

LayerData layer = new LayerData("${layerName}", ${width}, ${height}, shape);`;

    const jsonData = {
      name: layerName,
      width,
      height,
      slots: slotPoints
    };

    const dataStr = `// JSON Format (for saving/loading in this tool):\n${JSON.stringify(jsonData, null, 2)}\n\n${javaCode}`;
    const blob = new Blob([dataStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layerName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importLayer = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const jsonMatch = text.match(/\{[\s\S]*"slots"[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          setLayerName(data.name);
          setWidth(data.width);
          setHeight(data.height);

          const newGrid = Array(data.height).fill(null).map(() => Array(data.width).fill(null));
          data.slots.forEach(slot => {
            newGrid[slot.y][slot.x] = slot.type;
          });
          setGrid(newGrid);
        }
      } catch (err) {
        alert('Error loading file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const clearGrid = () => {
    if (window.confirm('Clear the entire grid?')) {
      initGrid(width, height);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Organ Painter</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Layer Settings</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Layer Name</label>
                  <input
                    type="text"
                    value={layerName}
                    onChange={(e) => setLayerName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm mb-1">Width</label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-gray-700 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Height</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-gray-700 rounded"
                    />
                  </div>
                </div>

                <button
                  onClick={handleResize}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Apply Size
                </button>

                <div>
                  <label className="block text-sm mb-1">Cell Size: {cellSize}px</label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={cellSize}
                    onChange={(e) => setCellSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Show Grid</span>
                </label>
              </div>
            </div>

            {/* Slot Types */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Slot Types</h2>

              <div className="space-y-2">
                <button
                  onClick={() => setSelectedType('ERASER')}
                  className={`w-full px-4 py-2 rounded flex items-center gap-2 ${selectedType === 'ERASER' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                >
                  Eraser
                </button>

                {Object.entries(SLOT_TYPES).map(([key, type]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedType(key)}
                    className={`w-full px-4 py-3 rounded flex items-center gap-3 ${selectedType === key ? 'ring-2 ring-blue-500' : ''
                      }`}
                    style={{ backgroundColor: type.color,
                    color: '#000000'
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded border border-gray-900"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-2">
              <button
                onClick={exportLayer}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center justify-center gap-2"
              >
                Export Layer
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={importLayer}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center justify-center gap-2"
              >
                Import Layer
              </button>

              <button
                onClick={clearGrid}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded flex items-center justify-center gap-2"
              >
                Clear Grid
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Canvas</h2>
              <div className="overflow-auto bg-gray-900 rounded p-4">
                <canvas
                  ref={canvasRef}
                  onMouseDown={(e) => {
                    setIsDrawing(true);
                    handleCanvasClick(e);
                  }}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                  onMouseMove={handleMouseMove}
                  className="cursor-crosshair"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Click and drag to draw. Selected: <span className="font-semibold text-blue-400">
                  {selectedType === 'ERASER' ? 'Eraser' : SLOT_TYPES[selectedType]?.name}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}