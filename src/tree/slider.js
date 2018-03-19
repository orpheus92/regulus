import * as d3 from 'd3';

export default function Slider() {
  let margin = {top: 15, right: 10, bottom: 0, left: 10};
  let width = 250 - margin.left - margin.right;
  let height = 35 - margin.top - margin.bottom;

  let scale = d3.scaleLog().domain([Number.EPSILON, 1]).range([0, width]).clamp(true);
  let axis =  d3.axisBottom(scale).ticks(3, '.1e');

  let range = [0, width];
  let name = 'x axis';
  let brush = d3.brushX().extent([[0, -10], [width, 0]])
    .on('brush', brushed)
    .on('end', brush_ended)
    .on('start', brush_started);

  let dispatch = d3.dispatch('change');

  function brushed() {
    let range = d3.event.selection.map(scale.invert);
    dispatch.call('change', this, range);
  }

  function brush_ended() {
  }

  function brush_started() {
  }

  function slider(selection) {
    let svg = selection.append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    svg.append('g')
      .attr('class', 'x axis')
      .call(axis);

    svg.append('g')
      .attr('class', 'brush')
      .call(brush);

    brush.move(svg.select('.brush'), range);

    svg.append('text')
      .attr('class', 'label')
      .attr('transform', `translate(${width/2},${height + margin.top + 20})`)
      .style('text-anchor', 'middle')
      .text('Persistence')
  }

  slider.range = function(_) {
    range = [scale(_[0]), scale(_[1])];
    return this;
  };

  slider.move = function(selection, _) {
    if (_[0] !== range[0] || _[1] !== range[1])
      selection.select('.brush').call(brush.move, [scale(_[0]), scale(_[1])]);
    return this;
  };

  slider.on = function(event, cb) {
    dispatch.on(event, cb);
    return this;
  };

  return slider;
}