import * as d3 from 'd3';
import {publish, subscribe} from "../utils/pubsub";
import {AttrValueFilter} from "../model/attr_filter";
import {and} from '../model/filter';
import Tree from './lifeline';
import Slider from './slider'

import template from './tree_view.html';
import feature_template from './feature.html';
import './style.css';
import './feature.css';

let root = null;
let msc = null;
let tree = Tree();

let format= d3.format('.3f');

let slider = Slider();
let prevent = false;
let saved = [0, 0];

let features = [
  {id: 0, name: 'fitness', label: 'fitness',
    domain: [0.8,1], step: 0.001, value: 1,
    cmp: (a,b) => a > b,
    filter: AttrValueFilter('fitness', null, (a,b) => a > b),
    active: false
  },

  {id: 1, name: 'parent_similarity', label: 'parent similarity',
    domain: [-1, 1], step: 0.01, value: 0.5,
    cmp: (a, b) => a < b,
    filter: AttrValueFilter('parent_similarity', null, (a,b) => a < b),
    active: false
  },

  {id: 2, name: 'sibling_similarity', label: 'sibling similarity',
    domain: [-1, 1], step: 0.01, value: 0.5,
    cmp: (a, b) => a < b,
    filter: AttrValueFilter('sibling_similarity', null, (a,b) => a < b),
    active: false
  }
];

let sliders = [
  { id: 'y', type: 'log', domain: [Number.EPSILON, 1], ticks:{ n: 3, format: '.1e'}, selection: [0.3, 1]},
  { id: 'x', type: 'linear', domain: [Number.EPSILON, 1], ticks: {n: 5, format: 'd'}, selection: [0, 1]}
];

let filter = and();

features.forEach(f => filter.add(f.filter));

export function setup(el) {
  root = d3.select(el);
  root.html(template);

  load_setup();

  root.select('#tree-y-type')
    .on('change', select_y_type)
    .property('value', sliders[0].type);

  root.select('#tree-x-type')
    .on('change', select_x_type)
    .property('value', sliders[1].type);

  tree
    .on('highlight', (node, on) => publish('partition.highlight', node, on))
    .on('select', (node, on) => publish('partition.selected', node, on))
    .on('details', (node, on) => publish('partition.details', node, on))
    .y_type(sliders[0].type)
    .x_type(sliders[1].type)
    .filter(filter);

  root.select('.tree').call(tree);
  resize();

  slider.on('change', on_slider_change);

  let s = root.selectAll('.slider')
    .data(sliders)
    .call(slider);

  subscribe('init', init);
  subscribe('data.new', (topic, data) => reset(data));
  subscribe('data.loaded', (topic, data) => reset(null));
  subscribe('data.updated', () => tree.update());

  subscribe('partition.highlight', (topic, partition, on) => tree.highlight(partition, on));
  subscribe('partition.details', (topic, partition, on) => tree.details(partition, on));
  subscribe('partition.selected', (topic, partition, on) => tree.selected(partition, on));
  subscribe('persistence.range', (topic, range) => set_persistence_range(range) );
}

export function set_size(w, h) {
  if (root) resize();
}

let version='1';

function load_setup() {
  if (localStorage.getItem('tree_view.version') === version) {
    features[0].value = +localStorage.getItem(`feature.${features[0].name}.value`);
    features[1].value = +localStorage.getItem(`feature.${features[1].name}.value`);
    features[2].value = +localStorage.getItem(`feature.${features[2].name}.value`);
    features[0].active = localStorage.getItem(`feature.${features[0].name}.active`) === 'on';
    features[1].active = localStorage.getItem(`feature.${features[1].name}.active`) === 'on';
    features[2].active = localStorage.getItem(`feature.${features[2].name}.active`) === 'on';

    tree.color_by( features[+localStorage.getItem('feature.color_by') || 0]);
    console.log('active = ',  features[0].active);
    console.log('active = ',  features[1].active);
    console.log('active = ',  features[2].active);

    features.forEach(f => {
      f.filter.active(f.active);
      f.filter.value(f.value);
    });

    sliders[0].type = localStorage.getItem('tree.y.type');
    sliders[1].type = localStorage.getItem('tree.x.type');
  } else {
    localStorage.setItem('tree_view.version', version);
  }
}

function resize() {
  let rw = parseInt(root.style('width'));
  let rh = parseInt(root.style('height'));
  let ch = parseInt(root.select('.config').style('height'));

  tree.set_size(rw, rh - ch);
}

function init() {
  let d3features = d3.select('.filtering_view')
    .selectAll('.feature')
    .data(features)
    .enter()
    .append('div')
    .html(feature_template);

  d3features.select('.feature-name').text(d => d.label);

  d3features.select('.feature-active')
    .property('checked', d => d.active)
    .on('change', activate_filter);

  d3features.select('.feature-slider')
    .property('value', d => d.value)
    .on('input', update_feature);

  d3features.select('.feature-cmap')
    .style('background-image', 'linear-gradient(to right, #3e926e, #f2f2f2, #9271e2');

  d3features.select('.feature-value')
    .text(d => format(d.value));

  d3features.select('.feature-slider')
    .attr('min', d => d.domain[0])
    .attr('max', d => d.domain[1])
    .attr('step', d => d.step)
    .property('value', d => d.value)
    .each( function(d) {
      update_feature.call(this, d);
    });

  d3.select('.filtering_view .color-by .feature-name')
    .on('change', update_color_by)
    .selectAll('option')
    .data(features)
    .enter()
    .append('option')
    .attr('value', d => d.id)
    .text(d => d.label);
}

function reset(data) {
  msc = data;

  process_data();

  if (!data)
    tree.data([], null);
  else {
    tree.data(msc.partitions, msc.tree);
    tree.x_range([0, msc.pts.length]);
    sliders[1].domain = [Number.EPSILON, msc.pts.length];
    root.selectAll('.slider').call(slider);
  }
}

function process_data() {
  if (!msc) return;
  visit(msc.tree, features[1].name, node => node.parent);
  visit(msc.tree, features[2].name, sibling );

  function visit(node, feature, func) {
    let other = func(node);
    if (other) {
      let c = node.model.linear_reg.coeff;
      let o = other.model.linear_reg.coeff;

      if (c.norm === undefined) c.norm = norm(c);
      if (o.norm === undefined) o.norm = norm(o);

      node.model[feature] = dot(c,o)/(c.norm * o.norm);
    } else {
      node.model[feature] = 1;
    }
    for (let child of node.children)
      visit(child, feature, func);
  }

  function norm(vec) {
    return Math.sqrt(vec.reduce( (a,v) => a + v*v, 0));
  }

  function dot(v1, v2) {
    let d = 0;
    for (let i=0; i<v1.length; i++) d += v1[i]*v2[i];
    return d;
  }

  function sibling(node) {
    if (node.parent) {
      for (let child of node.parent.children)
        if (child !== node) return child;
      return null;
    }
  }
}

function select_y_type() {
  tree.y_type(this.value);
  root.select('#persistence_slider').call(slider);
  localStorage.setItem('tree.y.type', this.value);
}

function select_x_type() {
  tree.x_type(this.value);
  root.select('#size_slider').call(slider);
  localStorage.setItem('tree.x.type', this.value);
}

function on_slider_change(data, range) {
  if (data.id === 'x') {
    tree.x_range(range);
    localStorage.setItem('tree.x.range', JSON.stringify(range));
  }
  else {
    tree.y_range(range);
    localStorage.setItem('tree.y.range', JSON.stringify(range));
  }
}

function set_persistence_range(range) {
  // if (!prevent) {
  //   prevent = true;
  //   if (saved[0] !== range[0] || saved[1] !== range[1]) {
  //     root.select('#persistence-slider')
  //       .call(slider.move, range);
  //   }
  //   prevent = false;
  // } else
  // if (prevent) console.log('tree set prevent');

}

function slider_range_update(range) {
  tree.range(range);
  if (!prevent) {
    prevent = true;
    saved = range;
    publish('persistence.range', range);
    prevent = false;
  }
  else
  if (prevent) console.log('tree slider prevent');
}

function select_feature(i) {
  current_feature = features[i];
  d3.select('#feature-slider')
    .attr('min', current_feature.domain[0])
    .attr('max', current_feature.domain[1])
    .attr('step', current_feature.step)
    .property('value', current_feature.value);

  tree.feature(current_feature);
  update_feature(current_feature.value);
  localStorage.setItem('feature.current', String(i));
}


function update_feature(feature) {
  let section = d3.select(this.parentNode.parentNode);

  feature.value = +this.value;
  feature.filter.value(feature.value);
  let at = 100*(feature.value - feature.domain[0])/(feature.domain[1] - feature.domain[0]);
  let [left, right] = feature.id === 0 ? [0, 100-at] : [at, 0];

  section.select('.feature-value').text(format(feature.value));

  // section.select('.feature-cover')
  //     .style('left', null)
  //     .style('width', `${at}%`);

  if (feature.id === 0)
    section.select('.feature-cover')
      .style('left', null)
      .style('width', `${at}%`);
  else
    section.select('.feature-cover')
      .style('left', `${at}%`)
      .style('width', `${100-at}%`);

  tree.update();
  localStorage.setItem(`feature.${feature.name}.value`, String(feature.value));
}

function activate_filter(feature) {
  let active = d3.select(this).property('checked');
  console.log('active:', active);
  feature.active = active;
  feature.filter.active(feature.active);
  tree.update();
  localStorage.setItem(`feature.${feature.name}.active`, feature.active ? 'on' : 'off');
}

function update_color_by() {
  let feature = features[+this.value];
  tree.color_by(feature);
  localStorage.setItem('feature.color_by', feature.id);
}