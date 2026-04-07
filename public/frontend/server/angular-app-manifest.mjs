
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
    "chunk-BPWEYVKG.js",
    "chunk-YZIDNEVJ.js",
    "chunk-WSTRFGGB.js",
    "chunk-BM7JHERH.js",
    "chunk-R7NNLNK2.js",
    "chunk-ZEOML7JY.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-QTYUFDSH.js",
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
    'index.csr.html': {size: 13649, hash: '7c6de3f2736c429875dcf36cb567638cd4dd6d59b68be8116531afaed6f500b1', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 8970, hash: '8ee0db402141b0a7af0265b49628c806d08c8875e2f18669d05c119c88d5b347', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-SRSN4G45.css': {size: 6467, hash: '5i8oqYLRDpk', text: () => import('./assets-chunks/styles-SRSN4G45_css.mjs').then(m => m.default)}
  },
};
