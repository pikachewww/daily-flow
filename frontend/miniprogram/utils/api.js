const { apiBaseUrl } = require("./config");

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiBaseUrl}${path}`,
      method: options.method || "GET",
      data: options.data || {},
      header: { "content-type": "application/json" },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data?.error?.message || "请求失败"));
        }
      },
      fail(error) {
        reject(new Error(error.errMsg || "网络错误"));
      }
    });
  });
}

module.exports = { request };
