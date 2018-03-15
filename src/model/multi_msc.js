import * as d3 from 'd3-array';
import Partition from "./partition";

function build_tree(partitions){
  let map = new Map();
  let root = null;

  if (partitions.length === 0) return root;
  root = partitions[0];

  for (let partition of partitions) {
    if (partition.lvl > root.lvl) root = partition;
    map.set(partition.id, partition);
  }

  visit(root, map);
  return root;

  function visit(node) {
    node.children = node.children.map(child => map.get(child));
    for (let child of node.children) {
      child.parent = node;
      visit(child);
    }
  }
}

export class MultiMSC {
  constructor() {
    this.name = "";
    this.pts = [];
    this.tree = [];
    this.partitions = [];

    this.ndims = 0;
    this.attr = [];
    this.dims = [];
    this.measures = [];
  }

  samples(pts, ndims) {
    this.pts = pts;
    let id = 0;
    for (let pt of pts) {
      pt.id = id++;
    }
    let n = pts.columns.length;
    this.attrs = pts.columns.map((name, i) => ({
      name,
      type: i< ndims && 'dim' || 'measure',
      extent: d3.extent(pts, pt => pt[name])
    }));
    this.dims = this.attrs.slice(0, ndims).sort( (a,b) => a.name > b.name);
    this.measures = this.attrs.slice(ndims).sort( (a,b) => a.name > b.name);

    return this;
  }

  partition_pts(partition) {
    if (!partition.pts) {
      let pts = [];
      for (let i = partition.pts_idx[0]; i < partition.pts_idx[1]; i++) {
        pts.push(this.pts[this.pts_idx[i]]);
      }
      // consider adding the min/max points
      partition.pts = pts;
    }
    return partition.pts;
  }

  measure_by_name(name) {
    return this.measures.find(m => m.name === name);
  }

  set msc(_) {
    this.name = _.name;
    this.pts_idx = _.pts;
    this.partitions = _.partitions.map(p => new Partition(p, this));
    this.tree = build_tree(this.partitions);

    this.measure = this.measures.find( m => m.name === this.name);
    return this;
  }
}