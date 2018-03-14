import {csv, json, text} from 'd3-fetch'


export function load_catalog() {
  return fetch('data/catalog.json')
    .then( response => response.json() )
}

export function load_data(catalog) {
  return csv(`data/${catalog.data}`,  null, parse_sample)
}

export function load_msc(name) {
  return fetch(`data/${name}.json`)
    .then( response => response.json());
}

export function submit_sampling(spec) {
  return fetch('resample', {
    method: 'post',
    body: JSON.stringify(spec),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function parse_sample(sample) {
  for (let attr in sample) {
    if (sample.hasOwnProperty(attr))
      sample[attr] = +sample[attr];
  }
  return sample;
}
