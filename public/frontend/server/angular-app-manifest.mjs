
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
    "chunk-KEERIJ6O.js",
    "chunk-YZIDNEVJ.js",
    "chunk-WSTRFGGB.js",
    "chunk-BM7JHERH.js",
    "chunk-R7NNLNK2.js",
    "chunk-ZEOML7JY.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-6JXT27JR.js",
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
    'index.csr.html': {size: 32892, hash: 'bb7314ac58f63908bb8d94c377ddf55cac07267b04121b79fc8efb0dac2d8e93', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 24621, hash: '563ff18dcd3c30d39be7e9f3c3983be6e099e8f0f1cdfa963dc27bc3914b84f7', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-5IICDY77.css': {size: 10151, hash: 'bgIYC/G4a7E', text: () => import('./assets-chunks/styles-5IICDY77_css.mjs').then(m => m.default)}
  },
};
