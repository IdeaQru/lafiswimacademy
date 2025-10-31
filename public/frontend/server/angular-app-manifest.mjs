
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
    "chunk-HX3DCJMB.js",
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
    'index.csr.html': {size: 8921, hash: 'c2e81253b1f5699f467f2b3e9c0a1cbb0b9685dbaa288b78f45e3958e845cffa', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 8584, hash: '76833d529edf7871aeb8e687559603361e9be216c11b819d6ae7baffb95a0589', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
