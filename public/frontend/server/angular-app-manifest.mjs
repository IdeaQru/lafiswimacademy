
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
    "chunk-KNTQ437I.js",
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
    'index.csr.html': {size: 8921, hash: '8f8dd87c8c319d53c699df62339a48aca58dba6417ac94dca83f5ecffe455b57', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 8584, hash: '7785df48aa7c2685ad5e16aaafa1bf2c263e7990c7f0544420f42a0800070f7a', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
