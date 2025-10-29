
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
    'index.csr.html': {size: 3803, hash: '9b42eb5ebe4039cd71f2d6a29932cd73f6d9b0457ae440c616eb24f641dd3be2', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 3466, hash: '231d3a08386766ac2d389d5f1d8247962f58dd847eda6623c1d393c410d51d17', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-Q63L6MFV.css': {size: 2052, hash: 'lKpZgfq6xJc', text: () => import('./assets-chunks/styles-Q63L6MFV_css.mjs').then(m => m.default)}
  },
};
