import { BatchInterceptor } from "@mswjs/interceptors";
import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { XMLHttpRequestInterceptor } from "@mswjs/interceptors/XMLHttpRequest";
import { attachNetworkListeners, type NetworkHookEvent, type NetworkLog } from "./network";

export function startBrowserNetworkLog(
  log: NetworkLog,
  endpoint?: string,
): () => void {
  const interceptor = new BatchInterceptor({
    name: "feedback-agent-network",
    interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
  });
  attachNetworkListeners(
    {
      on(event, listener) {
        interceptor.on(event, (payload) => listener(payload as NetworkHookEvent));
      },
    },
    log,
    endpoint,
  );
  interceptor.apply();
  return () => interceptor.dispose();
}
