const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true
})

// WebServer 배포할 경우 사용
// module.exports = {
//   devServer: {
//     host: '121.126.210.15',
//     port: 8081,
//     proxy: {
//       '^/': {
//         target: 'http://localhost:9466',
//         changeOrigin: true,
//         ws: true
//       }
//     }
//   }
// }