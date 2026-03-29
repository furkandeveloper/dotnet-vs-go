import http from 'k6/http';
import { check } from 'k6';

const GO_BASE       = 'http://localhost:8080';
const DOTNET_BASE   = 'http://localhost:8081';
const DOTNET11_BASE = 'http://localhost:8082';

const payload = JSON.stringify({
  price: 199.99,
  rules: [
    { type: 'percentage', value: 10 },
    { type: 'fixed',      value: 5  },
    { type: 'percentage', value: 5  },
    { type: 'fixed',      value: 2  },
  ],
});

const params = { headers: { 'Content-Type': 'application/json' } };

// 30s warm-up → 60s measure → 10s cool-down = 100s per app, 5s gap between apps
export const options = {
  scenarios: {
    go_cpu: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 50 },
        { duration: '60s', target: 50 },
        { duration: '10s', target: 0  },
      ],
      env: { BASE_URL: GO_BASE },
    },
    dotnet_cpu: {
      executor: 'ramping-vus',
      startTime: '105s',
      stages: [
        { duration: '30s', target: 50 },
        { duration: '60s', target: 50 },
        { duration: '10s', target: 0  },
      ],
      env: { BASE_URL: DOTNET_BASE },
    },
    dotnet11_cpu: {
      executor: 'ramping-vus',
      startTime: '210s',
      stages: [
        { duration: '30s', target: 50 },
        { duration: '60s', target: 50 },
        { duration: '10s', target: 0  },
      ],
      env: { BASE_URL: DOTNET11_BASE },
    },
  },
  thresholds: {
    'http_req_duration{scenario:go_cpu}':       ['p(95)<1000'],
    'http_req_duration{scenario:dotnet_cpu}':   ['p(95)<1000'],
    'http_req_duration{scenario:dotnet11_cpu}': ['p(95)<1000'],
    'http_req_failed{scenario:go_cpu}':         ['rate<0.01'],
    'http_req_failed{scenario:dotnet_cpu}':     ['rate<0.01'],
    'http_req_failed{scenario:dotnet11_cpu}':   ['rate<0.01'],
  },
};

export default function () {
  const res = http.post(`${__ENV.BASE_URL}/api/discount`, payload, params);
  check(res, { 'status 200': (r) => r.status === 200 });
}
