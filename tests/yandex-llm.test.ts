import { describe, expect, it, vi } from "vitest";
import { requestYandexReply } from "@/server/llm/gateway";

const options={
  apiKey:"test-key",folder:"b1g275m0meuirodub8v4",model:"deepseek-v4.1-flash/latest",
  timeoutMs:1000,instructions:"System prompt",history:[{role:"user" as const,content:"Здравствуйте, [NAME]"}],drafted:"Назовите удобное время.",
};

describe("Yandex Responses adapter",()=>{
  it("uses the configured model and project without storing the response",async()=>{
    const request=vi.fn(async()=>new Response(JSON.stringify({output:[{type:"message",content:[{type:"output_text",text:"Удобно ли завтра?"}]}]}),{status:200}));
    expect(await requestYandexReply(options,request as typeof fetch)).toBe("Удобно ли завтра?");
    const [url,init]=request.mock.calls[0] as unknown as [string,RequestInit];
    expect(url).toBe("https://ai.api.cloud.yandex.net/v1/responses");
    expect((init.headers as Record<string,string>)["OpenAI-Project"]).toBe(options.folder);
    const body=JSON.parse(init.body as string);
    expect(body).toMatchObject({model:`gpt://${options.folder}/${options.model}`,temperature:0.3,max_output_tokens:1500,store:false});
    expect(body.input[0].content).toBe("Здравствуйте, [NAME]");
  });

  it("falls back when the provider rejects the request",async()=>{
    const request=vi.fn(async()=>new Response("",{status:401}));
    expect(await requestYandexReply(options,request as typeof fetch)).toBeNull();
  });
});
