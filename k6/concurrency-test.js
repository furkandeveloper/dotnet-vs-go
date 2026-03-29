import http from 'k6/http';
import { check } from 'k6';

const GO_BASE       = 'http://localhost:8080';
const DOTNET_BASE   = 'http://localhost:8081';
const DOTNET11_BASE = 'http://localhost:8082';

export const options = {
  scenarios: {
    go_concurrency: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '60s', target: 1000 },
        { duration: '10s', target: 0    },
      ],
      env: { BASE_URL: GO_BASE },
    },
    dotnet_concurrency: {
      executor: 'ramping-vus',
      startTime: '105s',
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '60s', target: 1000 },
        { duration: '10s', target: 0    },
      ],
      env: { BASE_URL: DOTNET_BASE },
    },
    dotnet11_concurrency: {
      executor: 'ramping-vus',
      startTime: '210s',
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '60s', target: 1000 },
        { duration: '10s', target: 0    },
      ],
      env: { BASE_URL: DOTNET11_BASE },
    },
  },
  thresholds: {
    'http_req_duration{scenario:go_concurrency}':       ['p(95)<5000'],
    'http_req_duration{scenario:dotnet_concurrency}':   ['p(95)<5000'],
    'http_req_duration{scenario:dotnet11_concurrency}': ['p(95)<5000'],
    'http_req_failed{scenario:go_concurrency}':         ['rate<0.05'],
    'http_req_failed{scenario:dotnet_concurrency}':     ['rate<0.05'],
    'http_req_failed{scenario:dotnet11_concurrency}':   ['rate<0.05'],
  },
};

export default function () {
  const id  = Math.floor(Math.random() * 10) + 1;
  const res = http.get(`${__ENV.BASE_URL}/api/product/${id}`);
  check(res, { 'status 200': (r) => r.status === 200 });
}
