import * as d3 from 'd3';
import {publish, subscribe} from "../utils/pubsub";

// import Tree from './list';
import Tree from './lifeline';

import template from './tree_view.html';
import './style.css';

let root = null;
let msc = null;
let tree = Tree();


export function setup(el) {
  root = typeof el === 'string' && d3.select(el) || el;
  root.classed('tree_view', true);
  root.html(template);

  tree(root.select('.tree'))
    .on('highlight', (node, on) => publish('partition.highlight', node, on))
    .on('select', (node, on) => publish('partition.selected', node, on))
    .on('edit', node => publish('partition.edit', node));

  subscribe('data.new', (topic, data) => reset(data));
  subscribe('partition.highlight', (topic, partition, on) => {
    tree.highlight(partition, on);
  });
  subscribe('data.updated', () => tree.update());
}


function reset(data) {
  msc = data;

  tree.data(msc.partitions, msc.tree);
}


