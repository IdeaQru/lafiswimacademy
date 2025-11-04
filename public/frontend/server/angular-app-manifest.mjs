
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
    "chunk-USZQBSF7.js",
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
    'index.csr.html': {size: 8921, hash: '7ecefbeef3fb54f93deec1aa59599beb2686b28e8e2920eb0053b9be1fc74fe9', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 8584, hash: '251f7523fff88b7416c802fa9e6c69739ab24d19aa7aa333caa0e06488283469', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
