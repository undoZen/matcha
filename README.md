sfdevt = Snowball Frontend Development Toolkit
===

想要通过代理服务器的方式建立起一个通用的开发调试环境，可以通过此代理服务器载入单元测试，在线调试，模拟 ajax 接口数据等。

in progress...

Installation
------------

1. 安装 node v0.6.x, 推荐使用 [nvm](https://github.com/creationix/nvm)
2. `git clone git://github.com/xueqiu/matcha.git`
3. `cd matcha; npm install`
4. 弄个 `mcconfig.js` 文件，参考 `mcconfig.sample.xueqiu.js`
5. `NODE_ENV=test node app.js`
6. 浏览器代理设置成 127.0.0.1:8088，访问代理的网站如雪球
7. 访问时加 GET params `?_mc_test=duration,timeout` 可以加载 `mctest/` 目录下的 mocha test suites. duration 和 timeout 是 mocha 的例子。
