import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { to, templateName, languageCode = "en", parameters = [] } = await req.json();

    const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID || WHATSAPP_TOKEN === "WAITING_FOR_USER") {
      return NextResponse.json(
        { error: "WhatsApp credentials not configured yet." },
        { status: 500 }
      );
    }

    // Prepare components for the template message if there are parameters
    const components = parameters.length > 0 ? [
      {
        type: "body",
        parameters: parameters.map((param: string) => ({
          type: "text",
          text: param
        }))
      }
    ] : [];

    const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

    // Ensure phone number has country code but no '+' sign or spaces (WhatsApp format)
    const formattedPhone = to.replace(/[^0-9]/g, '');

    const body = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Meta Graph API Error:", data);
      return NextResponse.json({ error: data.error?.message || 'Meta API error' }, { status: response.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("WhatsApp API Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
