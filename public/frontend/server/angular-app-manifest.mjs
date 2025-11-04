
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: undefined,
  entryPointToBrowserMapping: {
  "src/app/pages/sidebar/add-news/add-news.ts": [
    "chunk-TGQ6UUWH.js",
    "chunk-KTB5P3BG.js",
    "chunk-S2YFGWBM.js",
    "chunk-H6LQATRN.js"
  ],
  "src/app/pages/sidebar/schedule/schedule.ts": [
    "chunk-VUWXA7IT.js",
    "chunk-R52DZ4SA.js",
    "chunk-S2YFGWBM.js",
    "chunk-KAYWDR7T.js",
    "chunk-H6LQATRN.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-VEP2AHC5.js",
    "chunk-H6LQATRN.js"
  ],
  "src/app/pages/home/home.ts": [
    "chunk-COWQ2T66.js",
    "chunk-KTB5P3BG.js",
    "chunk-KAYWDR7T.js"
  ],
  "src/app/pages/login/login.ts": [
    "chunk-GS4JRQUA.js",
    "chunk-H6LQATRN.js"
  ],
  "src/app/pages/registration/registration.ts": [
    "chunk-T75BTFBJ.js",
    "chunk-R52DZ4SA.js",
    "chunk-S2YFGWBM.js",
    "chunk-H6LQATRN.js"
  ],
  "src/app/pages/dashboard/dashboard.ts": [
    "chunk-6LPUHV43.js",
    "chunk-S2YFGWBM.js"
  ],
  "src/app/pages/sidebar/dashboard-home/dashboard-home.ts": [
    "chunk-IY7TATLY.js"
  ],
  "src/app/pages/sidebar/user-configuration/user-configuration.ts": [
    "chunk-JYM4ZF7U.js",
    "chunk-KAYWDR7T.js",
    "chunk-H6LQATRN.js"
  ],
  "src/app/pages/sidebar/students/students.ts": [
    "chunk-YA4YFPSM.js",
    "chunk-R52DZ4SA.js",
    "chunk-H6LQATRN.js"
  ],
  "src/app/pages/sidebar/coaches/coaches.ts": [
    "chunk-OFGVVBRR.js",
    "chunk-S2YFGWBM.js",
    "chunk-KAYWDR7T.js",
    "chunk-H6LQATRN.js"
  ]
},
  assets: {
    'index.csr.html': {size: 8921, hash: 'c37ddb38619bb9a913fc11b39e4e4aa8d1495b39ac5844560e65e32a4babe4d8', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 8584, hash: '465d33c7daf9ed44f552513807bc04fc02a3291ffd19f824d9c8caaeeb4a023d', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
