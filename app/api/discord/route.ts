import { NextRequest, NextResponse } from "next/server";

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1458808624108409027/KPd5kWqMibHlllNlGFO8T49hsl6D7_o8IcxcjvaITk8u7vn1Aff8ML3XqlkSTmwwlyEi";

/**
 * POST handler for Discord webhook notifications.
 *
 * This API route proxies requests to Discord to avoid CORS issues
 * when calling from the browser.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord webhook error:", errorText);
      return NextResponse.json(
        { error: "Failed to send Discord notification" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Discord webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
