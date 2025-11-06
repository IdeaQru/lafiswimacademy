
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: undefined,
  entryPointToBrowserMapping: {
  "src/app/pages/sidebar/add-news/add-news.ts": [
    "chunk-3ARFRNNR.js",
    "chunk-J4XX3QQB.js",
    "chunk-Q33SAH3W.js",
    "chunk-MOT44SR7.js"
  ],
  "src/app/pages/sidebar/schedule/schedule.ts": [
    "chunk-AKSHP5DA.js",
    "chunk-ZTXI2FE3.js",
    "chunk-Q33SAH3W.js",
    "chunk-TUTDETAW.js",
    "chunk-MOT44SR7.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-COTEWRIS.js",
    "chunk-MOT44SR7.js"
  ],
  "src/app/pages/home/home.ts": [
    "chunk-67P3K2DG.js",
    "chunk-J4XX3QQB.js",
    "chunk-TUTDETAW.js",
    "chunk-MOT44SR7.js"
  ],
  "src/app/pages/login/login.ts": [
    "chunk-SCRXKE63.js",
    "chunk-MOT44SR7.js"
  ],
  "src/app/pages/registration/registration.ts": [
    "chunk-NZNMFYUJ.js",
    "chunk-ZTXI2FE3.js",
    "chunk-Q33SAH3W.js",
    "chunk-MOT44SR7.js"
  ],
  "src/app/pages/dashboard/dashboard.ts": [
    "chunk-TWNN47NT.js",
    "chunk-Q33SAH3W.js"
  ],
  "src/app/pages/sidebar/dashboard-home/dashboard-home.ts": [
    "chunk-375IV5FG.js"
  ],
  "src/app/pages/sidebar/user-configuration/user-configuration.ts": [
    "chunk-X4DNNSRW.js",
    "chunk-TUTDETAW.js",
    "chunk-MOT44SR7.js"
  ],
  "src/app/pages/sidebar/students/students.ts": [
    "chunk-5Z2IQIJ6.js",
    "chunk-ZTXI2FE3.js",
    "chunk-MOT44SR7.js"
  ],
  "src/app/pages/sidebar/coaches/coaches.ts": [
    "chunk-WBLQFNJH.js",
    "chunk-Q33SAH3W.js",
    "chunk-TUTDETAW.js",
    "chunk-MOT44SR7.js"
  ]
},
  assets: {
    'index.csr.html': {size: 8921, hash: '356e797962c409f6e8bb0a9b4c3d1a7508d21272f2db94eebf032fbe1ca393fd', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 8584, hash: 'dc4f379ed23f40bd154195ff926aa1e3c0a2ee39ea35e272963b6a0992d3aec2', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
