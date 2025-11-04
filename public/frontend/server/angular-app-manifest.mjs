
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: undefined,
  entryPointToBrowserMapping: {
  "src/app/pages/sidebar/add-news/add-news.ts": [
    "chunk-IWTQQMQB.js",
    "chunk-2PDFHF7X.js",
    "chunk-CGSKK3II.js",
    "chunk-RKCD26AO.js"
  ],
  "src/app/pages/sidebar/schedule/schedule.ts": [
    "chunk-WVQEZOMC.js",
    "chunk-HK4YLQVY.js",
    "chunk-CGSKK3II.js",
    "chunk-TFJFIFAX.js",
    "chunk-RKCD26AO.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-6X7KWT4R.js",
    "chunk-RKCD26AO.js"
  ],
  "src/app/pages/home/home.ts": [
    "chunk-HED5W3SC.js",
    "chunk-2PDFHF7X.js",
    "chunk-TFJFIFAX.js",
    "chunk-RKCD26AO.js"
  ],
  "src/app/pages/login/login.ts": [
    "chunk-F5SSC7QT.js",
    "chunk-RKCD26AO.js"
  ],
  "src/app/pages/registration/registration.ts": [
    "chunk-7VFD35VM.js",
    "chunk-HK4YLQVY.js",
    "chunk-CGSKK3II.js",
    "chunk-RKCD26AO.js"
  ],
  "src/app/pages/dashboard/dashboard.ts": [
    "chunk-CWO65XKK.js",
    "chunk-CGSKK3II.js"
  ],
  "src/app/pages/sidebar/dashboard-home/dashboard-home.ts": [
    "chunk-BI4S66HZ.js"
  ],
  "src/app/pages/sidebar/user-configuration/user-configuration.ts": [
    "chunk-NQJILF4V.js",
    "chunk-TFJFIFAX.js",
    "chunk-RKCD26AO.js"
  ],
  "src/app/pages/sidebar/students/students.ts": [
    "chunk-2R5BY4XL.js",
    "chunk-HK4YLQVY.js",
    "chunk-RKCD26AO.js"
  ],
  "src/app/pages/sidebar/coaches/coaches.ts": [
    "chunk-XSFUIKXZ.js",
    "chunk-CGSKK3II.js",
    "chunk-TFJFIFAX.js",
    "chunk-RKCD26AO.js"
  ]
},
  assets: {
    'index.csr.html': {size: 8921, hash: '06a4a0c16d211658514778c81e7b620b378d15597a2ca3c0b7ef2c00945676fe', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 8584, hash: '39008971066170dc9871e980439d6e1f3f74f1bbb540fbe1e491e502e74d7407', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
