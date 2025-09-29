// Web Worker for ultra-fast data comparison
self.onmessage = function(e) {
  const { data1, data2, compareColumns, fileName1, fileName2 } = e.data;
  
  try {
    // Pre-compute column indices for faster access
    const colIndices = compareColumns.map((col: string) => {
      const idx1 = data1.length > 0 ? Object.keys(data1[0]).indexOf(col) : -1;
      const idx2 = data2.length > 0 ? Object.keys(data2[0]).indexOf(col) : -1;
      return { col, idx1, idx2 };
    });

    // Optimized key creation function
    const createKey = (row: any, isData1: boolean) => {
      let key = '';
      for (const { col, idx1, idx2 } of colIndices) {
        const idx = isData1 ? idx1 : idx2;
        if (idx >= 0) {
          const values = Object.values(row);
          key += (values[idx] || '') + '|';
        }
      }
      return key;
    };

    // Build data2 map efficiently
    const data2Map = new Map();
    const data2Keys = new Set();
    
    for (let i = 0; i < data2.length; i++) {
      const row = data2[i];
      const key = createKey(row, false);
      data2Map.set(key, row);
      data2Keys.add(key);
    }

    // Process data1 efficiently
    const matches: any[] = [];
    const mismatches: any[] = [];
    const uniqueToFirst: any[] = [];
    const data1Keys = new Set();

    for (let i = 0; i < data1.length; i++) {
      const row1 = data1[i];
      const key = createKey(row1, true);
      data1Keys.add(key);
      
      const row2 = data2Map.get(key);
      if (row2) {
        // Quick match check - only compare the selected columns
        let isMatch = true;
        const differences: string[] = [];
        
        for (const { col } of colIndices) {
          if (String(row1[col]) !== String(row2[col])) {
            isMatch = false;
            differences.push(col);
          }
        }
        
        if (isMatch) {
          matches.push({ ...row1, _source: fileName1, _match: row2 });
        } else {
          mismatches.push({ 
            ...row1, 
            _source: fileName1, 
            _match: row2,
            _differences: differences
          });
        }
      } else {
        uniqueToFirst.push({ ...row1, _source: fileName1 });
      }
    }

    // Find unique records in data2 efficiently
    const uniqueToSecond: any[] = [];
    for (let i = 0; i < data2.length; i++) {
      const row2 = data2[i];
      const key = createKey(row2, false);
      if (!data1Keys.has(key)) {
        uniqueToSecond.push({ ...row2, _source: fileName2 });
      }
    }

    // Send results back
    self.postMessage({
      success: true,
      result: { matches, mismatches, uniqueToFirst, uniqueToSecond }
    });

  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message
    });
  }
};
