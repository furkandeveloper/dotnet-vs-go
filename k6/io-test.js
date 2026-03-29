import http from 'k6/http';
import { check } from 'k6';

const GO_BASE       = 'http://localhost:8080';
const DOTNET_BASE   = 'http://localhost:8081';
const DOTNET11_BASE = 'http://localhost:8082';

export const options = {
  scenarios: {
    go_io: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 100 },
        { duration: '60s', target: 100 },
        { duration: '10s', target: 0   },
      ],
      env: { BASE_URL: GO_BASE },
    },
    dotnet_io: {
      executor: 'ramping-vus',
      startTime: '105s',
      stages: [
        { duration: '30s', target: 100 },
        { duration: '60s', target: 100 },
        { duration: '10s', target: 0   },
      ],
      env: { BASE_URL: DOTNET_BASE },
    },
    dotnet11_io: {
      executor: 'ramping-vus',
      startTime: '210s',
      stages: [
        { duration: '30s', target: 100 },
        { duration: '60s', target: 100 },
        { duration: '10s', target: 0   },
      ],
      env: { BASE_URL: DOTNET11_BASE },
    },
  },
  thresholds: {
    'http_req_duration{scenario:go_io}':       ['p(95)<1000'],
    'http_req_duration{scenario:dotnet_io}':   ['p(95)<1000'],
    'http_req_duration{scenario:dotnet11_io}': ['p(95)<1000'],
    'http_req_failed{scenario:go_io}':         ['rate<0.01'],
    'http_req_failed{scenario:dotnet_io}':     ['rate<0.01'],
    'http_req_failed{scenario:dotnet11_io}':   ['rate<0.01'],
  },
};

export default function () {
  const id  = Math.floor(Math.random() * 10) + 1;
  const res = http.get(`${__ENV.BASE_URL}/api/product/${id}`);
  check(res, { 'status 200': (r) => r.status === 200 });
}
