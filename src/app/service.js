// import {csv, json, text} from 'd3-fetch'


export function load_catalog() {
  return fetch('catalog')
    .then( response => response.json() )
}

export function load_dataset(name) {
  return fetch(`data/${name}`)
    .then( d => d.json());
}

export function submit_resample(spec) {
  return fetch('resample', {
    method: 'post',
    body: JSON.stringify(spec),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

