/**
 * @name 代理的配置
 * @see 在生产环境 代理是无法生效的，所以这里没有生产环境的配置
 * -------------------------------
 * The agent cannot take effect in the production environment
 * so there is no configuration of the production environment
 * For details, please see
 * https://pro.ant.design/docs/deploy
 *
 * @doc https://umijs.org/docs/guides/proxy
 */
/** 无 mock 的 Legacy API 开发代理；XOne 实连模式仍会保留应用原有 /api/** 请求。 */
const legacyApiProxy = {
  target: 'http://127.0.0.1:3000',
  // 保留浏览器的 localhost:8000 Origin，交由 Express CORS Allowlist 校验。
  changeOrigin: false,
};

/**
 * 真实 XOne 地址只从启动环境读取，禁止写入浏览器代码或提交固定内网地址。
 * 离线开发不调用本函数，继续由 mock/xone.ts 接管 /web/**。
 */
export const createXoneProxy = (target?: string) => {
  if (!target) {
    throw new Error('实连 XOne 必须设置 XONE_API_TARGET');
  }
  return {
    '/api/': legacyApiProxy,
    '/web/': {
      target,
      // 真实 XOne 通常按目标 Host 路由，开发代理需要改写 Host。
      changeOrigin: true,
    },
  };
};

export default {
  dev: {
    // 无 mock 开发模式下，将前端 /api 请求转发到本地 Express 服务。
    '/api/': legacyApiProxy,
  },
  /**
   * @name 详细的代理配置
   * @doc https://github.com/chimurai/http-proxy-middleware
   */
  test: {
    // localhost:8000/api/** -> https://pro-api.ant-design-demo.workers.dev/api/**
    '/api/': {
      target: 'https://pro-api.ant-design-demo.workers.dev',
      changeOrigin: true,
    },
  },
  pre: {
    '/api/': {
      target: 'your pre url',
      changeOrigin: true,
    },
  },
};
