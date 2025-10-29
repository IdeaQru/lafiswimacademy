
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: undefined,
  entryPointToBrowserMapping: {
  "src/app/pages/sidebar/add-news/add-news.ts": [
    "chunk-NRTYI2VK.js",
    "chunk-WQIBYQPC.js",
    "chunk-IE5OCRMK.js",
    "chunk-X4FUVRDZ.js"
  ],
  "src/app/pages/sidebar/schedule/schedule.ts": [
    "chunk-3HFQ3XOL.js",
    "chunk-7MYJHMX5.js",
    "chunk-IE5OCRMK.js",
    "chunk-MKLDNYIJ.js",
    "chunk-X4FUVRDZ.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-DUAPMGEO.js",
    "chunk-X4FUVRDZ.js"
  ],
  "src/app/pages/home/home.ts": [
    "chunk-6FWM4RJM.js",
    "chunk-WQIBYQPC.js",
    "chunk-MKLDNYIJ.js"
  ],
  "src/app/pages/login/login.ts": [
    "chunk-VDSLELLR.js",
    "chunk-X4FUVRDZ.js"
  ],
  "src/app/pages/registration/registration.ts": [
    "chunk-IHEYDTVE.js",
    "chunk-7MYJHMX5.js",
    "chunk-IE5OCRMK.js",
    "chunk-X4FUVRDZ.js"
  ],
  "src/app/pages/dashboard/dashboard.ts": [
    "chunk-MTLCGHU3.js",
    "chunk-IE5OCRMK.js"
  ],
  "src/app/pages/sidebar/dashboard-home/dashboard-home.ts": [
    "chunk-YSN7DRQO.js"
  ],
  "src/app/pages/sidebar/user-configuration/user-configuration.ts": [
    "chunk-MLUFOF6O.js",
    "chunk-MKLDNYIJ.js",
    "chunk-X4FUVRDZ.js"
  ],
  "src/app/pages/sidebar/students/students.ts": [
    "chunk-EML4J5AG.js",
    "chunk-7MYJHMX5.js",
    "chunk-X4FUVRDZ.js"
  ],
  "src/app/pages/sidebar/coaches/coaches.ts": [
    "chunk-LSEBTBWG.js",
    "chunk-IE5OCRMK.js",
    "chunk-MKLDNYIJ.js",
    "chunk-X4FUVRDZ.js"
  ]
},
  assets: {
    'index.csr.html': {size: 4408, hash: '212f8b36f8232560da20eb2ee6dd060741521c967e88b6e4abb4e8e3c6ac17c4', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 4071, hash: 'b595376faebd53170bc99de034926a78c3263ec08e67061e67da35f46b1dbb58', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
