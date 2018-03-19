

export function resample(spec, n) {
  let dims = spec.dims.map(d => d.name);
  let len = spec.measure.length;

  let weights = Array(len).fill(0);
  for (let dim of spec.dims) {
    let total = dim.to.reduce((s,v) => s + v) - dim.from.reduce((s,v) => s+v);
    for (let i = 0; i < len; i++) {
      weights[i] += (dim.to[i] - dim.from[i])/total;
    }
  }

  let stairs = [weights[0]];
  for (let i=1; i<len; i++) {
    stairs.push(weights[i] + stairs[i-1]);
  }

  let total = stairs[len-1];
  let samples = [];
  for (let s=0; s<n; s++) {
    let sample = [];

    let r = Math.random() * total;
    let idx = stairs.findIndex(v => v > r);
    for (let dim of spec.dims) {
      sample.push(dim.from[idx] + Math.random() * (dim.to[idx] - dim.from[idx]));
    }
    samples.push([spec.measure[idx], sample]);
  }

  return samples;
}

