
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: undefined,
  entryPointToBrowserMapping: {
  "src/app/pages/sidebar/add-news/add-news.ts": [
    "chunk-XLBC7LVZ.js",
    "chunk-7X3RFNOR.js",
    "chunk-IGAGJ5Y5.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/sidebar/schedule/schedule.ts": [
    "chunk-W236YJJW.js",
    "chunk-DPBYUBLZ.js",
    "chunk-IGAGJ5Y5.js",
    "chunk-L4VYE3NA.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-MLL267SL.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/home/home.ts": [
    "chunk-PQL2FYRD.js",
    "chunk-7X3RFNOR.js",
    "chunk-L4VYE3NA.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/login/login.ts": [
    "chunk-XNVDY7QB.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/registration/registration.ts": [
    "chunk-EJHZPF3J.js",
    "chunk-DPBYUBLZ.js",
    "chunk-IGAGJ5Y5.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/dashboard/dashboard.ts": [
    "chunk-ZJR6WOVP.js",
    "chunk-IGAGJ5Y5.js"
  ],
  "src/app/pages/sidebar/dashboard-home/dashboard-home.ts": [
    "chunk-24YCW2YZ.js"
  ],
  "src/app/pages/sidebar/user-configuration/user-configuration.ts": [
    "chunk-AJA73W7G.js",
    "chunk-L4VYE3NA.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/sidebar/students/students.ts": [
    "chunk-O3S32PUZ.js",
    "chunk-DPBYUBLZ.js",
    "chunk-GYJS2I37.js"
  ],
  "src/app/pages/sidebar/coaches/coaches.ts": [
    "chunk-JVWLQTWW.js",
    "chunk-IGAGJ5Y5.js",
    "chunk-L4VYE3NA.js",
    "chunk-GYJS2I37.js"
  ]
},
  assets: {
    'index.csr.html': {size: 8921, hash: 'a98c487a9865f1713356e03fc0ef2e4d38dec99177a233406aa52bd371ee62d9', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 8584, hash: '5750a43f557e4f461cb24252d4b889b26927a7a7735f1b87e078420fb5182a52', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
