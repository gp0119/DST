const siteOriginPlaceholder = "__SITE_ORIGIN__";

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html")) return response;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    const origin = new URL(request.url).origin;
    const html = (await response.text()).replaceAll(
      siteOriginPlaceholder,
      origin,
    );

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
