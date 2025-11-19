
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: undefined,
  entryPointToBrowserMapping: {
  "src/app/pages/sidebar/add-news/add-news.ts": [
    "chunk-HP232XUO.js",
    "chunk-ZAQKV3AZ.js",
    "chunk-65JJV7WV.js",
    "chunk-LKTXU4ZY.js"
  ],
  "src/app/pages/sidebar/schedule/schedule.ts": [
    "chunk-VLIS7VN4.js",
    "chunk-C2UT65CU.js",
    "chunk-KYE62AF7.js",
    "chunk-65JJV7WV.js",
    "chunk-KJZSSDT6.js",
    "chunk-LKTXU4ZY.js"
  ],
  "src/app/pages/sidebar/reports/reports.ts": [
    "chunk-OH6LMOJP.js",
    "chunk-65JJV7WV.js",
    "chunk-LKTXU4ZY.js"
  ],
  "src/app/pages/home/home.ts": [
    "chunk-PZYXZR6L.js",
    "chunk-ZAQKV3AZ.js",
    "chunk-KJZSSDT6.js",
    "chunk-LKTXU4ZY.js"
  ],
  "src/app/pages/login/login.ts": [
    "chunk-KY7T4N6Z.js",
    "chunk-LKTXU4ZY.js"
  ],
  "src/app/pages/registration/registration.ts": [
    "chunk-E3XTTGQ2.js",
    "chunk-KYE62AF7.js",
    "chunk-65JJV7WV.js",
    "chunk-LKTXU4ZY.js"
  ],
  "src/app/pages/dashboard/dashboard.ts": [
    "chunk-DKFJF5YE.js",
    "chunk-65JJV7WV.js"
  ],
  "src/app/pages/sidebar/dashboard-home/dashboard-home.ts": [
    "chunk-R4GZX3C7.js"
  ],
  "src/app/pages/sidebar/user-configuration/user-configuration.ts": [
    "chunk-YERJ7MPN.js",
    "chunk-C2UT65CU.js",
    "chunk-KJZSSDT6.js",
    "chunk-LKTXU4ZY.js"
  ],
  "src/app/pages/sidebar/students/students.ts": [
    "chunk-JBLCOG7S.js",
    "chunk-KYE62AF7.js",
    "chunk-LKTXU4ZY.js"
  ],
  "src/app/pages/sidebar/coaches/coaches.ts": [
    "chunk-YTIZV54I.js",
    "chunk-65JJV7WV.js",
    "chunk-KJZSSDT6.js",
    "chunk-LKTXU4ZY.js"
  ]
},
  assets: {
    'index.csr.html': {size: 32892, hash: '96bdcb4770db5034b59386f23cf024bba5b8cb448e063e3c3e319448b03b861e', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 24621, hash: 'f25303d95666249258190850d761497de96501eacf8ee916540f2abf4cb48e45', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-5IICDY77.css': {size: 10151, hash: 'bgIYC/G4a7E', text: () => import('./assets-chunks/styles-5IICDY77_css.mjs').then(m => m.default)}
  },
};
