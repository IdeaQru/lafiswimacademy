
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
    'index.csr.html': {size: 67616, hash: 'd868f38f82c4a86a91f3158f4dde76462a50750683bd77b8dd73c3170eb9313e', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 9091, hash: 'b7673ad3431ad1196d3f8f127f70e3fdc9443050878ef93d52a9c4b608abfd60', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-FPDJAUOZ.css': {size: 110174, hash: 'iUxOX/xcFuo', text: () => import('./assets-chunks/styles-FPDJAUOZ_css.mjs').then(m => m.default)}
  },
};
