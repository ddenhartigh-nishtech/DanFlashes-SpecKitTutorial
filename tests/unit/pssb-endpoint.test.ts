import { describe, expect, it } from "vitest";
import { DEFAULT_PSSB, pssbEndpoint } from "@/lib/pssb/endpoint";

const none = { pssbModelUrl: null, pssbModel: null };

describe("pssbEndpoint (012 R1, R10, Q5)", () => {
  it("defaults to this machine's llama3.2:3b", () => {
    expect(DEFAULT_PSSB).toEqual({ url: "http://localhost:11434", model: "llama3.2:3b" });
    expect(pssbEndpoint(none, {})).toEqual(DEFAULT_PSSB);
  });

  it("takes the environment over the default", () => {
    expect(
      pssbEndpoint(none, {
        PSSB_MODEL_URL: "http://192.168.1.102:11434/",
        PSSB_MODEL: "qwen2.5:3b",
      }),
    ).toEqual({ url: "http://192.168.1.102:11434", model: "qwen2.5:3b" });
  });

  it("takes Dan's Settings over both, and a blank override falls through", () => {
    const env = { PSSB_MODEL_URL: "http://env:11434", PSSB_MODEL: "env-model" };
    expect(
      pssbEndpoint({ pssbModelUrl: "http://laptop:11434", pssbModel: "qwen2.5:7b" }, env),
    ).toEqual({ url: "http://laptop:11434", model: "qwen2.5:7b" });
    expect(pssbEndpoint({ pssbModelUrl: "  ", pssbModel: null }, env)).toEqual({
      url: "http://env:11434",
      model: "env-model",
    });
  });
});
