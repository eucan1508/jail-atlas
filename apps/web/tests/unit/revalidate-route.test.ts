import { afterEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));

const secret = "test-revalidate-secret-at-least-32-characters";

function request(token?: string) {
  return new Request("https://example.test/api/revalidate/", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {}
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  revalidatePath.mockReset();
});

describe("cache purge route", () => {
  it("is disabled while no secret is configured", async () => {
    const { POST } = await import("@/app/api/revalidate/route");
    expect(POST(request(secret)).status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a wrong token and purges every page with the right one", async () => {
    vi.stubEnv("REVALIDATE_SECRET", secret);
    const { POST } = await import("@/app/api/revalidate/route");
    expect(POST(request()).status).toBe(401);
    expect(POST(request(`${secret}x`)).status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();

    const response = POST(request(secret));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
