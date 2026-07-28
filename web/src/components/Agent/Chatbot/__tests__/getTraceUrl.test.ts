import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock out UI libraries to avoid ES module import failures in Node test runner
vi.mock("antd", () => {
  const MockComponent = () => null;
  return {
    Radio: { Group: MockComponent },
    Bubble: MockComponent,
    Sender: MockComponent,
    Button: MockComponent,
    Input: MockComponent,
    Tooltip: MockComponent,
  };
});
vi.mock("@ant-design/icons", () => ({}));
vi.mock("@ant-design/x", () => ({
  Bubble: () => null,
}));
vi.mock("react-scroll-to-bottom", () => ({ default: () => null }));
vi.mock("@/components/Infra", () => ({
  Markdown: () => null,
  Loading: () => null,
}));
vi.mock("@/components/Infra/Loading", () => ({ default: () => null }));
vi.mock("@/registry/common/MessageBrief", () => ({ default: () => null }));
vi.mock("../ToolRender", () => ({ default: () => null }));
vi.mock("../Workspace/TaskProgress", () => ({ default: () => null }));
vi.mock("../AgentHeader", () => ({ default: () => null }));
vi.mock("../Chatbot/StartScreen", () => ({ default: () => null }));
vi.mock("../Chatbot/PreviewScreen", () => ({ default: () => null }));
vi.mock("@/registry/website_delivery/WebsiteDeliveryEndWindow", () => ({ default: () => null }));
vi.mock("@/components/Agent/Chatbot/Sender", () => ({ default: () => null }));
vi.mock("@/components/Agent/Chatbot/MessageAttachments", () => ({ default: () => null }));
vi.mock("@/registry/website_delivery", () => ({
  findCompletedWebsiteDelivery: () => undefined,
  isWebsiteDeliveryMessage: () => false,
  isWebsitePreviewMessage: () => false,
  isWebsiteType: () => false,
}));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock("@/store", () => ({ useAgentStore: () => ({}) }));

import { getTraceUrl } from "../index";
import * as utils from "@/utils";

// Mock isDevOrTest from utils
vi.mock("@/utils", async (importOriginal) => {
  const original = await importOriginal<typeof utils>();
  return {
    ...original,
    isDevOrTest: vi.fn(),
  };
});

describe("getTraceUrl", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return undefined if traceId is missing or empty", () => {
    expect(getTraceUrl()).toBeUndefined();
    expect(getTraceUrl(null)).toBeUndefined();
    expect(getTraceUrl("")).toBeUndefined();
  });

  it("should generate BOE trace URL when in development/test", () => {
    vi.mocked(utils.isDevOrTest).mockReturnValue(true);

    const traceId = "test-trace-id-123";
    const result = getTraceUrl(traceId);

    const expectedTargetPath = `/project/cmpb1czn80005zi07nicibopt/traces/${traceId}`;
    const expectedUrl = `https://langfuse.lingyiwanwu.net${expectedTargetPath}`;

    expect(result).toBe(expectedUrl);
  });

  it("should generate production trace URL when not in development/test", () => {
    vi.mocked(utils.isDevOrTest).mockReturnValue(false);

    const traceId = "prod-trace-id-789";
    const result = getTraceUrl(traceId);

    const expectedTargetPath = `/project/cmpp7aas7000618077kps0pgo/traces/${traceId}`;
    const expectedUrl = `https://trace.wanzhi.com${expectedTargetPath}`;

    expect(result).toBe(expectedUrl);
  });

  it("should encode trace ids in direct URLs", () => {
    vi.mocked(utils.isDevOrTest).mockReturnValue(true);

    expect(getTraceUrl("trace/with spaces")).toBe(
      "https://langfuse.lingyiwanwu.net/project/cmpb1czn80005zi07nicibopt/traces/trace%2Fwith%20spaces",
    );
  });
});
