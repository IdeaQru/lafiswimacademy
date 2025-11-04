
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
    "chunk-NNBMAKTG.js",
    "chunk-R52DZ4SA.js",
    "chunk-S2YFGWBM.js",
    "chunk-KAYWDR7T.js",
    "chunk-H6LQATRN.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-NABNT2ES.js",
    "chunk-H6LQATRN.js"
  ],
  "src/app/pages/home/home.ts": [
    "chunk-COWQ2T66.js",
    "chunk-KTB5P3BG.js",
    "chunk-KAYWDR7T.js"
  ],
  "src/app/pages/login/login.ts": [
    "chunk-NL4RV4DI.js",
    "chunk-H6LQATRN.js"
  ],
  "src/app/pages/registration/registration.ts": [
    "chunk-T75BTFBJ.js",
    "chunk-R52DZ4SA.js",
    "chunk-S2YFGWBM.js",
    "chunk-H6LQATRN.js"
  ],
  "src/app/pages/dashboard/dashboard.ts": [
    "chunk-3YRN2KJ5.js",
    "chunk-S2YFGWBM.js"
  ],
  "src/app/pages/sidebar/dashboard-home/dashboard-home.ts": [
    "chunk-OY6GGI43.js"
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
    'index.csr.html': {size: 8921, hash: 'b19a4cc61c730433830008a20f5fad6a6ab5f88941e7539c71669190b20f0ef2', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 8584, hash: '8f36987cacbcb3228b5ee16fd511b00a0dcef6074ec85d16a59108426c4416f2', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
