
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: undefined,
  entryPointToBrowserMapping: {
  "src/app/pages/sidebar/add-news/add-news.ts": [
    "chunk-ZKBFD4UX.js",
    "chunk-QN3X5CXR.js",
    "chunk-BM7JHERH.js",
    "chunk-ZEOML7JY.js"
  ],
  "src/app/pages/sidebar/schedule/schedule.ts": [
    "chunk-MAI6TDDF.js",
    "chunk-YZIDNEVJ.js",
    "chunk-WSTRFGGB.js",
    "chunk-BM7JHERH.js",
    "chunk-R7NNLNK2.js",
    "chunk-ZEOML7JY.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-3MAHIRG2.js",
    "chunk-BM7JHERH.js",
    "chunk-ZEOML7JY.js"
  ],
  "src/app/pages/home/home.ts": [
    "chunk-I7IMGFOE.js",
    "chunk-QN3X5CXR.js",
    "chunk-R7NNLNK2.js",
    "chunk-ZEOML7JY.js"
  ],
  "src/app/pages/login/login.ts": [
    "chunk-ZMXQHYQ7.js",
    "chunk-ZEOML7JY.js"
  ],
  "src/app/pages/registration/registration.ts": [
    "chunk-ALGKPVMP.js",
    "chunk-WSTRFGGB.js",
    "chunk-BM7JHERH.js",
    "chunk-ZEOML7JY.js"
  ],
  "src/app/pages/dashboard/dashboard.ts": [
    "chunk-BC25ENG6.js",
    "chunk-BM7JHERH.js"
  ],
  "src/app/pages/sidebar/dashboard-home/dashboard-home.ts": [
    "chunk-54N67H3V.js"
  ],
  "src/app/pages/sidebar/user-configuration/user-configuration.ts": [
    "chunk-KGAG4WYR.js",
    "chunk-YZIDNEVJ.js",
    "chunk-R7NNLNK2.js",
    "chunk-ZEOML7JY.js"
  ],
  "src/app/pages/sidebar/students/students.ts": [
    "chunk-GQNCEUSM.js",
    "chunk-WSTRFGGB.js",
    "chunk-ZEOML7JY.js"
  ],
  "src/app/pages/sidebar/coaches/coaches.ts": [
    "chunk-QVPZSL23.js",
    "chunk-BM7JHERH.js",
    "chunk-R7NNLNK2.js",
    "chunk-ZEOML7JY.js"
  ]
},
  assets: {
    'index.csr.html': {size: 32892, hash: 'dfd7fcbfce974164b0d4f9c55c9c9c31fff0107db2beb47b3a651d34128139e1', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 24621, hash: 'a5a60309725d7d4b3bbb32c81e5b28c0e1f0974f75a4aea8e151dffdd677c6cc', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-5IICDY77.css': {size: 10151, hash: 'bgIYC/G4a7E', text: () => import('./assets-chunks/styles-5IICDY77_css.mjs').then(m => m.default)}
  },
};
