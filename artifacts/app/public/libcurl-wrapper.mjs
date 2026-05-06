import LibcurlClient from "/libcurl/index.mjs";

export default class WrappedLibcurlClient extends LibcurlClient {
  async request(remote, method, body, headers, signal) {
    const result = await super.request(remote, method, body, headers, signal);
    if (result.headers) {
      const plain = {};
      try {
        for (const [k, v] of result.headers) {
          plain[k.toLowerCase()] = v;
        }
      } catch (_) {}
      result.headers = plain;
    }
    return result;
  }
}
