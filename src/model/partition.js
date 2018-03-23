import * as d3 from 'd3';
import {inverseMultipleRegression, averageStd, linspace, fun as kernel, subLinearSpace} from '../statistics/regression';

let bandwidth_factor = 0.1;


export default class Partition {
  constructor(data, msc) {
    this.id = data.id;
    this.lvl = data.lvl;

    this.minmax_idx = data.minmax_idx;
    this.minmax = [msc.pts[data.minmax_idx[0]][msc.name], msc.pts[data.minmax_idx[1]][msc.name]];
    this.pts_idx = data.span;
    this._pts = data.pts;

    this.parent = data.parent;
    this.children = data.children;

    this.msc = msc;

    this.alias = null;
    this.notes = null;

    this.size = this.pts_idx[1]-this.pts_idx[0];

    this._reg_curve = null;
    this._stat = null;
  }

  get dims() {
    return this.msc.dims;
  }

  get measures() {
    return this.msc.measures;
  }

  get measure_name() {
    return this.msc.name;
  }

  get pts() {
    if (!this._pts) {
      let t0 = performance.now();
      let pts = [];
      let msc_pts = this.msc.pts;
      let msc_idx = this.msc.pts_idx;
      let to = this.pts_idx[1];
      for (let i = this.pts_idx[0]; i < to; i++) {
        pts.push(msc_pts[msc_idx[i]]);
      }
      pts.push(msc_pts[msc_idx[this.minmax_idx[0]]]);
      pts.push(msc_pts[msc_idx[this.minmax_idx[1]]]);

      this._pts = pts;
      let t1 = performance.now();
      console.log(`compute pts in ${d3.format('d')(t1-t0)} msec`);
    }
    return this._pts;
  }

  get statistics() {
    if (!this._stat) {
      this._stat = new Map();

      let pts = this.pts;
      for (let attr of this.msc.attrs) {
        let values = pts.map(pt => pt[attr.name]);
        values.sort((a, b) => a - b);

        this._stat.set(attr.name, {
          name: attr.name,
          type: attr.type,
          measure: attr.name === this.measure_name,
          n: values.length+2,
          quantile: [
            d3.quantile(values, 0.25),
            d3.quantile(values, 0.5),
            d3.quantile(values, 0.75)],
          min: values[0],
          max: values[values.length - 1],
          extent: attr.extent
        });
      }
    }
    return this._stat;
  }

  get regression_curve() {
    if (!this._reg_curve) {
      let t0 = performance.now();
      let current_measure = this.msc.measure; //

      let dims = this.pts.map( pt => this.msc.dims.map( d => pt[d.name] ));
      let measure = this.pts.map( pt => pt[current_measure.name]);

      let t1 = performance.now();
      let extent = current_measure.extent;
      let bandwidth = bandwidth_factor * (extent[1] - extent[0]);

      let py = subLinearSpace(this.minmax, extent, 100);
      this.inversse_regression_curve = inverseMultipleRegression(dims, measure, kernel.gaussian, bandwidth);
      this.std_dev = averageStd(dims, measure, kernel.gaussian, bandwidth);
      let px = this.inversse_regression_curve(py);
      let std = this.std_dev(py, px);

      let curve = [];
      for (let i=0; i<py.length; i++) {
        curve.push(px[i].concat([py[i]]));
      }
      let columns = this.dims.map(d => d.name).concat(current_measure.name);

      this._reg_curve = {curve, std, columns};
      let t2 = performance.now();
      console.log(`compute regression curve in ${d3.format('d')(t2-t0)} msec  [get pts in ${d3.format('d')(t1-t0)} msec]`);
    }
    return this._reg_curve;
  }
}