
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: undefined,
  entryPointToBrowserMapping: {
  "src/app/pages/sidebar/add-news/add-news.ts": [
    "chunk-FUSDYVJ6.js",
    "chunk-DSXEWXCC.js",
    "chunk-KIU6VAAI.js",
    "chunk-MUSTNSHW.js"
  ],
  "src/app/pages/sidebar/schedule/schedule.ts": [
    "chunk-LE2YYAUN.js",
    "chunk-GCENORCN.js",
    "chunk-KIU6VAAI.js",
    "chunk-PIEGDITW.js",
    "chunk-MUSTNSHW.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-NPRBBFJY.js",
    "chunk-MUSTNSHW.js"
  ],
  "src/app/pages/home/home.ts": [
    "chunk-6CWXTNE5.js",
    "chunk-DSXEWXCC.js",
    "chunk-PIEGDITW.js"
  ],
  "src/app/pages/login/login.ts": [
    "chunk-QYBXYMYI.js",
    "chunk-MUSTNSHW.js"
  ],
  "src/app/pages/registration/registration.ts": [
    "chunk-KOAQLGD3.js",
    "chunk-GCENORCN.js",
    "chunk-KIU6VAAI.js",
    "chunk-MUSTNSHW.js"
  ],
  "src/app/pages/dashboard/dashboard.ts": [
    "chunk-EDLW4QLL.js",
    "chunk-KIU6VAAI.js"
  ],
  "src/app/pages/sidebar/dashboard-home/dashboard-home.ts": [
    "chunk-I564LGAZ.js"
  ],
  "src/app/pages/sidebar/user-configuration/user-configuration.ts": [
    "chunk-2QBVBANS.js",
    "chunk-PIEGDITW.js",
    "chunk-MUSTNSHW.js"
  ],
  "src/app/pages/sidebar/students/students.ts": [
    "chunk-OVOWJYDU.js",
    "chunk-GCENORCN.js",
    "chunk-MUSTNSHW.js"
  ],
  "src/app/pages/sidebar/coaches/coaches.ts": [
    "chunk-CGAZPGNU.js",
    "chunk-KIU6VAAI.js",
    "chunk-PIEGDITW.js",
    "chunk-MUSTNSHW.js"
  ]
},
  assets: {
    'index.csr.html': {size: 4408, hash: 'fc57317dc1cd2842cf016a71d9d80bb983fce0877f8c57f11c22f88029110459', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 4071, hash: '84fc9cb4d52128d8adf9460c6be906def6aa9b2d279c6d3f12148f73aee3c39f', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
