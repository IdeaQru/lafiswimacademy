
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: undefined,
  entryPointToBrowserMapping: {
  "src/app/pages/sidebar/add-news/add-news.ts": [
    "chunk-XLBC7LVZ.js",
    "chunk-7X3RFNOR.js",
    "chunk-IGAGJ5Y5.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/sidebar/schedule/schedule.ts": [
    "chunk-5MSDAXSP.js",
    "chunk-DPBYUBLZ.js",
    "chunk-IGAGJ5Y5.js",
    "chunk-T3MBPB64.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-MLL267SL.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/home/home.ts": [
    "chunk-CMXHFP67.js",
    "chunk-7X3RFNOR.js",
    "chunk-T3MBPB64.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/login/login.ts": [
    "chunk-XNVDY7QB.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/registration/registration.ts": [
    "chunk-EJHZPF3J.js",
    "chunk-DPBYUBLZ.js",
    "chunk-IGAGJ5Y5.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/dashboard/dashboard.ts": [
    "chunk-ZJR6WOVP.js",
    "chunk-IGAGJ5Y5.js"
  ],
  "src/app/pages/sidebar/dashboard-home/dashboard-home.ts": [
    "chunk-24YCW2YZ.js"
  ],
  "src/app/pages/sidebar/user-configuration/user-configuration.ts": [
    "chunk-L7FTUCZ5.js",
    "chunk-T3MBPB64.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/sidebar/students/students.ts": [
    "chunk-O3S32PUZ.js",
    "chunk-DPBYUBLZ.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/sidebar/coaches/coaches.ts": [
    "chunk-ZHR2ONQN.js",
    "chunk-IGAGJ5Y5.js",
    "chunk-T3MBPB64.js",
    "chunk-GYJS2I37.js"
  ]
},
  assets: {
    'index.csr.html': {size: 8921, hash: '03efba127116c16c06c9ca4a519a8b6ebe91d0635f2d5ca068ea21970320b3b6', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 8584, hash: 'a5d73d1558296b11d5b981c58a515302ec9933dd2224aa7bfd7ad66b28378ac8', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
