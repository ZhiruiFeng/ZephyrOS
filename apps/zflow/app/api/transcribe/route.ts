import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is not set on server" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Expected multipart/form-data with 'file'" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const language = (form.get("language") as string) || "auto";
    // 默认先用 whisper-1，兼容性最好；如果客户端指定了其他模型，则优先使用
    const requestedModel = (form.get("model") as string) || "whisper-1";

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "Missing 'file' in form-data" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const callOpenAI = async (model: string): Promise<Response> => {
      const upstream = new FormData();
      upstream.append("file", file as File, (file as File).name || "audio.webm");
      upstream.append("model", model);
      if (language && language !== "auto") upstream.append("language", language);
      upstream.append("response_format", "json");

      return fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: upstream as any,
      });
    }

    let resp = await callOpenAI(requestedModel);

    // 若失败且不是 whisper-1，则回退再试 whisper-1
    if (!resp.ok && requestedModel !== "whisper-1") {
      const firstErrorText = await resp.text().catch(() => "");
      console.error("Transcription with model", requestedModel, "failed:", firstErrorText);
      resp = await callOpenAI("whisper-1");
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.error("Fallback to whisper-1 also failed:", errText);
        return new Response(
          JSON.stringify({ error: "OpenAI transcription failed", detail: errText || firstErrorText }),
          { status: 502, headers: { "content-type": "application/json" } }
        );
      }
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "OpenAI transcription failed", detail: errText }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }

    const data = await resp.json();
    return new Response(JSON.stringify({ text: data.text || "", raw: data }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Transcription error", detail: String(error?.message || error) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}


