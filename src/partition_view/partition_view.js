import * as d3 from 'd3';
import {publish, subscribe} from '../utils/pubsub';
import BoxPlot from '../components/boxplot';
import template from './partition_view.html';
import './style.css';


let root = null;
let highlight = null;
let selected = null;
let current = null;
let timer = null;
let msc = null;
let measure = null;

let format = d3.format('.2g');

let box_plot = BoxPlot()
  .width(100)
  .height(10)
  .tickFormat(d3.format('.2s'));


export function setup(el) {
  root = typeof el === 'string' && d3.select(el) || el;
  root.classed('partition_view', true);
  root.html(template);

  root.on('mouseenter', d => current && publish('partition.highlight', current, true));
  root.on('mouseleave',  d => current && publish('partition.highlight', current, false));

  root.select('.partition_alias')
    .property('disabled', true)
    .on('change', alias_changed)
    .on('input', d => console.log('input', d));

  root.select('.partition_notes')
    .property('disabled', true)
    .on('change', notes_changed)
    .on('input', d => console.log('input', d));

  subscribe('data.pts', (topic, data) => reset(data));
  subscribe('partition.highlight', (topic, partition, show) => highlight_partition(partition, show));
  subscribe('partition.selected', (topic, partition, show) => select_partition(partition, show));
}


function alias_changed() {
  current.alias = this.value;
}

function notes_changed() {
  current.notes = this.value;
}

function reset(data) {
  msc = data;
  show_partition();
}

function select_partition(partition, show) {
  selected = show && partition || null;
  current = selected || highlight;
  show_partition()
}


function highlight_partition(partition, show) {
  if (!show) {
    timer = d3.timeout( () => {highlight = null; show_partition(); }, 150);
  } else {
    if (timer) {
      timer.stop();
      timer = null;
    }
    highlight = partition;
    show_partition();
  }
}

function show_partition() {
  current = highlight || selected || msc.as_partition;

  root.select('.partition_id')
    .classed('selected', current === selected)
    .classed('highlight', current === highlight)
    .text(current && current.id || "");

  root.select('.partition_alias')
    .property('value', current && current.alias || "")
    .attr('disabled', current ? null : true);

  root.select('.partition_size')
    .text(current && current.size || '');

  root.select('.partition_notes')
    .property('value', current && current.notes || "")
    .attr('disabled', current ? null : true);


  let stat = current && Array.from(current.statistics.values()) || [];

  let dims = stat.filter(s => s.type === 'dim').sort((a,b) => a.name < b.name);
  show('.dims', dims);

  let measures = stat.filter(s => s.type === 'measure').sort( (a,b) => a.measure || a.name < b.name ? -1 : 1);
  show('.measures', measures, true);
}

function show(selector, data, listen=false) {
  let stats = root.select(selector).selectAll('.stat')
    .data(data);

  stats.exit().remove();

  let boxes = stats.enter()
    .append('div')
    .attr('class', 'stat');

  boxes.append('label').attr('class', 'name');
  if (listen) {
    boxes.on('click', select_measure);
  }

  let margin = {top: 0, right: 0, bottom: 10, left: 20};
  let width = 100, height=10;
  boxes.append('svg')
    .attr('class', 'box-plot')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  let b = boxes.merge(stats);
  b.select('.name').text(d => d.name);

  b.select('svg')
    .call(box_plot);
}

function select_measure(d) {
  if (measure === d /*|| !d.available*/) return;

  if (measure) measure.selected = false;
  measure = d;
  measure.selected = true;
  root.select('.measures').selectAll('.name')
    .classed('selected', d => d.selected);

  publish('load.measure', measure.name);
}

