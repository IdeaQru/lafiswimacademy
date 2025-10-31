
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: undefined,
  entryPointToBrowserMapping: {
  "src/app/pages/sidebar/add-news/add-news.ts": [
    "chunk-W3KQ3JBE.js",
    "chunk-ZBB3GB6U.js",
    "chunk-E7TDDVCV.js",
    "chunk-2COAJKLJ.js"
  ],
  "src/app/pages/sidebar/schedule/schedule.ts": [
    "chunk-TOPCPPLZ.js",
    "chunk-OTNMM7R5.js",
    "chunk-E7TDDVCV.js",
    "chunk-ZQJPLYYF.js",
    "chunk-2COAJKLJ.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-23STJGAI.js",
    "chunk-2COAJKLJ.js"
  ],
  "src/app/pages/home/home.ts": [
    "chunk-CRPOCY73.js",
    "chunk-ZBB3GB6U.js",
    "chunk-ZQJPLYYF.js"
  ],
  "src/app/pages/login/login.ts": [
    "chunk-XCGQTSCA.js",
    "chunk-2COAJKLJ.js"
  ],
  "src/app/pages/registration/registration.ts": [
    "chunk-3XYQHFTH.js",
    "chunk-OTNMM7R5.js",
    "chunk-E7TDDVCV.js",
    "chunk-2COAJKLJ.js"
  ],
  "src/app/pages/dashboard/dashboard.ts": [
    "chunk-KLJP4IVT.js",
    "chunk-E7TDDVCV.js"
  ],
  "src/app/pages/sidebar/dashboard-home/dashboard-home.ts": [
    "chunk-MQ6ELV63.js"
  ],
  "src/app/pages/sidebar/user-configuration/user-configuration.ts": [
    "chunk-DIZ4DCH6.js",
    "chunk-ZQJPLYYF.js",
    "chunk-2COAJKLJ.js"
  ],
  "src/app/pages/sidebar/students/students.ts": [
    "chunk-QQOJUNJF.js",
    "chunk-OTNMM7R5.js",
    "chunk-2COAJKLJ.js"
  ],
  "src/app/pages/sidebar/coaches/coaches.ts": [
    "chunk-KIQSYKWQ.js",
    "chunk-E7TDDVCV.js",
    "chunk-ZQJPLYYF.js",
    "chunk-2COAJKLJ.js"
  ]
},
  assets: {
    'index.csr.html': {size: 4408, hash: 'b52b6f527345ce5e9d6de06a11aa5eb3dc1179a1754bb439c5fe92f1ebefa63b', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 4071, hash: 'b4c600342f12e0e7652bd5684929ea81b6c12bda116a698143335cd4097fb6b6', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
