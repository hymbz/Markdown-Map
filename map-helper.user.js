// ==UserScript==
// @name         markdown-map-helper
// @namespace    markdown-map-helper
// @version      0.0.1
// @description  为 Markdown Map 增加功能
// @author       hymbz
// @match        http://localhost:*/*
// @match        https://mdmap.pages.dev/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @connect      smms.app
// @connect      sm.ms
// ==/UserScript==

unsafeWindow.uploadSMMS = async ({ blob, token, on }) => {
  const formData = new FormData();
  formData.append('smfile', new File([blob], 'img', { type: blob.type }));

  let res = await new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://smms.app/api/v2/upload',
      data: formData,
      headers: { Authorization: token },
      responseType: 'json',
      onload: resolve,
      onerror: reject,
      ontimeout: reject,
    });
  });
  res = res.response;

  const url = res.images || res.data?.url;
  if (!url) throw new Error(res.message);
  await on?.(url, res);
  return url;
};
